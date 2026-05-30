import * as fs from 'fs';
import * as path from 'path';

// archiver v8 and unzipper require CommonJS import
const archiver = require('archiver');
const unzipper = require('unzipper');

export interface ArchiveOptions {
  /** Compression level (0-9), default 6 */
  level?: number;
  /** Password for encryption (not supported by archiver, placeholder) */
  password?: string;
  /** Exclude patterns */
  exclude?: string[];
  /** Include hidden files */
  includeHidden?: boolean;
}

export interface ArchiveProgress {
  /** Bytes processed */
  processed: number;
  /** Total bytes */
  total: number;
  /** Progress percentage (0-100) */
  percent: number;
  /** Current file being processed */
  currentFile?: string;
}

export interface ArchiveInfo {
  /** Archive file path */
  path: string;
  /** File size in bytes */
  size: number;
  /** Number of files in archive */
  fileCount: number;
  /** List of files in archive */
  files: ArchiveFileEntry[];
  /** Creation time */
  createdAt: Date;
}

export interface ArchiveFileEntry {
  /** File path within archive */
  path: string;
  /** File size in bytes */
  size: number;
  /** Whether entry is a directory */
  isDirectory: boolean;
  /** Last modified time */
  lastModified?: Date;
}

export interface CompressResult {
  /** Output file path */
  outputPath: string;
  /** Output file size */
  outputSize: number;
  /** Number of files compressed */
  fileCount: number;
  /** Original total size */
  originalSize: number;
  /** Compression ratio (0-1) */
  compressionRatio: number;
  /** Time taken in milliseconds */
  duration: number;
}

export interface DecompressResult {
  /** Output directory */
  outputDir: string;
  /** Number of files extracted */
  fileCount: number;
  /** Total extracted size */
  totalSize: number;
  /** Time taken in milliseconds */
  duration: number;
}

export class ArchiveService {
  private static instance: ArchiveService;
  private tempDir: string;

  private constructor() {
    this.tempDir = path.join(process.cwd(), 'data', 'temp', 'archives');
    this.ensureTempDir();
  }

  static getInstance(): ArchiveService {
    if (!ArchiveService.instance) {
      ArchiveService.instance = new ArchiveService();
    }
    return ArchiveService.instance;
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Compress files/directories into a ZIP archive
   */
  async compressZip(
    sources: string[],
    outputPath: string,
    options: ArchiveOptions = {},
    onProgress?: (progress: ArchiveProgress) => void
  ): Promise<CompressResult> {
    const startTime = Date.now();
    const level = options.level ?? 6;

    // Validate sources
    for (const source of sources) {
      if (!fs.existsSync(source)) {
        throw new Error(`Source path does not exist: ${source}`);
      }
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Calculate total size for progress
    let totalSize = 0;
    let fileCount = 0;
    for (const source of sources) {
      const stats = await this.getPathStats(source);
      totalSize += stats.size;
      fileCount += stats.count;
    }

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      // archiver v8 API: new ZipArchive(options)
      const archive = new archiver.ZipArchive({
        zlib: { level },
        // Store timestamps
        forceLocalTime: true
      });

      let processedBytes = 0;

      output.on('close', () => {
        const outputSize = archive.pointer();
        resolve({
          outputPath,
          outputSize,
          fileCount,
          originalSize: totalSize,
          compressionRatio: totalSize > 0 ? 1 - (outputSize / totalSize) : 0,
          duration: Date.now() - startTime
        });
      });

      archive.on('error', (err: any) => {
        reject(err);
      });

      archive.on('progress', (progress: any) => {
        processedBytes = progress.entries.processed;
        if (onProgress) {
          onProgress({
            processed: processedBytes,
            total: totalSize,
            percent: totalSize > 0 ? Math.round((processedBytes / totalSize) * 100) : 0,
            currentFile: progress.entries?.processed?.toString()
          });
        }
      });

      archive.pipe(output);

      // Add sources to archive
      for (const source of sources) {
        const stats = fs.statSync(source);
        const name = path.basename(source);

        if (stats.isDirectory()) {
          archive.directory(source, name, (entry: any) => {
            // Apply exclude patterns
            if (options.exclude) {
              for (const pattern of options.exclude) {
                if (entry.name.match(new RegExp(pattern))) {
                  return false;
                }
              }
            }
            // Skip hidden files if not included
            if (!options.includeHidden && entry.name.startsWith('.')) {
              return false;
            }
            return entry;
          });
        } else {
          archive.file(source, { name });
        }
      }

      archive.finalize();
    });
  }

  /**
   * Decompress a ZIP archive
   */
  async decompressZip(
    archivePath: string,
    outputDir: string,
    options: ArchiveOptions = {},
    onProgress?: (progress: ArchiveProgress) => void
  ): Promise<DecompressResult> {
    const startTime = Date.now();

    if (!fs.existsSync(archivePath)) {
      throw new Error(`Archive file does not exist: ${archivePath}`);
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get archive info for progress tracking
    const archiveInfo = await this.getArchiveInfo(archivePath);
    const totalSize = archiveInfo.files.reduce((sum, f) => sum + f.size, 0);
    let processedSize = 0;
    let fileCount = 0;

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(archivePath)
        .pipe(unzipper.Parse({ forceStream: true }));

      const extractedFiles: string[] = [];

      stream.on('entry', async (entry: any) => {
        const fileName = entry.path;
        const type = entry.type; // 'Directory' or 'File'
        const size = (entry as any).vars?.uncompressedSize || 0;

        // Apply exclude patterns
        if (options.exclude) {
          for (const pattern of options.exclude) {
            if (fileName.match(new RegExp(pattern))) {
              entry.autodrain();
              return;
            }
          }
        }

        // Skip hidden files if not included
        if (!options.includeHidden && path.basename(fileName).startsWith('.')) {
          entry.autodrain();
          return;
        }

        const outputPath = path.join(outputDir, fileName);

        if (type === 'Directory') {
          fs.mkdirSync(outputPath, { recursive: true });
          entry.autodrain();
        } else {
          // Ensure parent directory exists
          const parentDir = path.dirname(outputPath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }

          // Extract file
          const writeStream = fs.createWriteStream(outputPath);
          entry.pipe(writeStream);

          await new Promise<void>((res, rej) => {
            writeStream.on('finish', () => {
              processedSize += size;
              fileCount++;
              extractedFiles.push(outputPath);

              if (onProgress) {
                onProgress({
                  processed: processedSize,
                  total: totalSize,
                  percent: totalSize > 0 ? Math.round((processedSize / totalSize) * 100) : 0,
                  currentFile: fileName
                });
              }
              res();
            });
            writeStream.on('error', rej);
          });
        }
      });

      stream.on('close', () => {
        resolve({
          outputDir,
          fileCount,
          totalSize: processedSize,
          duration: Date.now() - startTime
        });
      });

      stream.on('error', (err: any) => {
        reject(err);
      });
    });
  }

  /**
   * Get information about a ZIP archive without extracting
   */
  async getArchiveInfo(archivePath: string): Promise<ArchiveInfo> {
    if (!fs.existsSync(archivePath)) {
      throw new Error(`Archive file does not exist: ${archivePath}`);
    }

    const stats = fs.statSync(archivePath);
    const files: ArchiveFileEntry[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(archivePath)
        .pipe(unzipper.Parse({ forceStream: true }))
        .on('entry', (entry: any) => {
          const fileName = entry.path;
          const type = entry.type;
          const size = (entry as any).vars?.uncompressedSize || 0;

          files.push({
            path: fileName,
            size,
            isDirectory: type === 'Directory',
            lastModified: (entry as any).vars?.lastModifiedDateTime
          });

          entry.autodrain();
        })
        .on('close', () => {
          resolve({
            path: archivePath,
            size: stats.size,
            fileCount: files.filter(f => !f.isDirectory).length,
            files,
            createdAt: stats.birthtime
          });
        })
        .on('error', (err: any) => {
          reject(err);
        });
    });
  }

  /**
   * Compress a directory (convenience method)
   */
  async compressDirectory(
    dirPath: string,
    outputPath?: string,
    options?: ArchiveOptions,
    onProgress?: (progress: ArchiveProgress) => void
  ): Promise<CompressResult> {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }

    const dirName = path.basename(dirPath);
    const output = outputPath || path.join(this.tempDir, `${dirName}.zip`);

    return this.compressZip([dirPath], output, options, onProgress);
  }

  /**
   * Extract to a temporary directory and return the path
   */
  async extractToTemp(
    archivePath: string,
    subDir?: string
  ): Promise<string> {
    const dirName = subDir || path.basename(archivePath, path.extname(archivePath));
    const outputDir = path.join(this.tempDir, dirName);

    await this.decompressZip(archivePath, outputDir);
    return outputDir;
  }

  /**
   * List contents of an archive (alias for getArchiveInfo)
   */
  async listContents(archivePath: string): Promise<ArchiveFileEntry[]> {
    const info = await this.getArchiveInfo(archivePath);
    return info.files;
  }

  /**
   * Get stats for a path (file or directory)
   */
  private async getPathStats(filePath: string): Promise<{ size: number; count: number }> {
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      return { size: stats.size, count: 1 };
    }

    // Directory - recursively calculate
    let totalSize = 0;
    let count = 0;

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          const fileStats = fs.statSync(fullPath);
          totalSize += fileStats.size;
          count++;
        }
      }
    };

    walk(filePath);
    return { size: totalSize, count };
  }

  /**
   * Clean up temporary files
   */
  async cleanup(maxAgeMs: number = 3600000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const stats = fs.statSync(fullPath);

        if (entry.isDirectory()) {
          walk(fullPath);
          // Remove empty directories
          try {
            fs.rmdirSync(fullPath);
          } catch {}
        } else if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
          cleaned++;
        }
      }
    };

    walk(this.tempDir);
    return cleaned;
  }
}

export default ArchiveService;
