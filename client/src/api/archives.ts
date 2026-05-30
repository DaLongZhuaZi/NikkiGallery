import axios from 'axios';

const api = axios.create({
  baseURL: '/api/archives',
  timeout: 300000, // 5 minutes for large archives
});

export interface CompressOptions {
  /** Compression level (0-9) */
  level?: number;
  /** Exclude patterns (regex) */
  exclude?: string[];
  /** Include hidden files */
  includeHidden?: boolean;
}

export interface DecompressOptions {
  /** Exclude patterns (regex) */
  exclude?: string[];
  /** Include hidden files */
  includeHidden?: boolean;
}

export interface CompressResult {
  outputPath: string;
  outputSize: number;
  fileCount: number;
  originalSize: number;
  compressionRatio: number;
  duration: number;
  fileName: string;
}

export interface DecompressResult {
  outputDir: string;
  fileCount: number;
  totalSize: number;
  duration: number;
}

export interface ArchiveInfo {
  path: string;
  size: number;
  sizeFormatted: string;
  fileCount: number;
  files: ArchiveFileEntry[];
  createdAt: string;
  fileName: string;
}

export interface ArchiveFileEntry {
  path: string;
  size: number;
  sizeFormatted?: string;
  isDirectory: boolean;
  lastModified?: string;
}

/**
 * Compress files/directories into a ZIP archive
 */
export async function compress(
  sources: string[],
  outputPath?: string,
  options?: CompressOptions
): Promise<CompressResult> {
  const response = await api.post('/compress', {
    sources,
    outputPath,
    ...options
  });
  return response.data.data;
}

/**
 * Decompress a ZIP archive
 */
export async function decompress(
  archivePath: string,
  outputDir?: string,
  options?: DecompressOptions
): Promise<DecompressResult> {
  const response = await api.post('/decompress', {
    archivePath,
    outputDir,
    ...options
  });
  return response.data.data;
}

/**
 * Get information about a ZIP archive
 */
export async function getInfo(archivePath: string): Promise<ArchiveInfo> {
  const response = await api.post('/info', { archivePath });
  return response.data.data;
}

/**
 * List contents of an archive
 */
export async function listContents(archivePath: string): Promise<ArchiveFileEntry[]> {
  const response = await api.post('/list', { archivePath });
  return response.data.data;
}

/**
 * Extract a single file from an archive
 */
export async function extractSingle(
  archivePath: string,
  filePath: string,
  outputPath?: string
): Promise<{ extractedPath: string; tempDir?: string }> {
  const response = await api.post('/extract-single', {
    archivePath,
    filePath,
    outputPath
  });
  return response.data.data;
}

/**
 * Clean up temporary files
 */
export async function cleanup(maxAgeMs?: number): Promise<number> {
  const response = await api.post('/cleanup', { maxAgeMs });
  return response.data.data.cleaned;
}
