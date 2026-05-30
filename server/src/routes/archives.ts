import { Router, Request, Response } from 'express';
import { ArchiveService } from '../services/ArchiveService';
import path from 'path';
import fs from 'fs';

const router = Router();
const archiveService = ArchiveService.getInstance();

/**
 * POST /archives/compress
 * Compress files/directories into a ZIP archive
 */
router.post('/compress', async (req: Request, res: Response) => {
  try {
    const { sources, outputPath, level, exclude, includeHidden } = req.body;

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({ error: 'sources array is required' });
    }

    // Generate output path if not provided
    const output = outputPath || path.join(
      archiveService['tempDir'],
      `archive_${Date.now()}.zip`
    );

    const result = await archiveService.compressZip(
      sources,
      output,
      { level, exclude, includeHidden }
    );

    res.json({
      success: true,
      data: {
        ...result,
        fileName: path.basename(result.outputPath)
      }
    });
  } catch (error: any) {
    console.error('Compress error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /archives/decompress
 * Decompress a ZIP archive
 */
router.post('/decompress', async (req: Request, res: Response) => {
  try {
    const { archivePath, outputDir, exclude, includeHidden } = req.body;

    if (!archivePath) {
      return res.status(400).json({ error: 'archivePath is required' });
    }

    // Generate output directory if not provided
    const output = outputDir || path.join(
      archiveService['tempDir'],
      path.basename(archivePath, path.extname(archivePath))
    );

    const result = await archiveService.decompressZip(
      archivePath,
      output,
      { exclude, includeHidden }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Decompress error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /archives/info
 * Get information about a ZIP archive
 */
router.post('/info', async (req: Request, res: Response) => {
  try {
    const { archivePath } = req.body;

    if (!archivePath) {
      return res.status(400).json({ error: 'archivePath is required' });
    }

    const info = await archiveService.getArchiveInfo(archivePath);

    res.json({
      success: true,
      data: {
        ...info,
        fileName: path.basename(info.path),
        sizeFormatted: formatBytes(info.size)
      }
    });
  } catch (error: any) {
    console.error('Get archive info error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /archives/list
 * List contents of an archive
 */
router.post('/list', async (req: Request, res: Response) => {
  try {
    const { archivePath } = req.body;

    if (!archivePath) {
      return res.status(400).json({ error: 'archivePath is required' });
    }

    const files = await archiveService.listContents(archivePath);

    res.json({
      success: true,
      data: files.map(f => ({
        ...f,
        sizeFormatted: formatBytes(f.size)
      }))
    });
  } catch (error: any) {
    console.error('List archive error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /archives/extract-single
 * Extract a single file from an archive
 */
router.post('/extract-single', async (req: Request, res: Response) => {
  try {
    const { archivePath, filePath, outputPath } = req.body;

    if (!archivePath || !filePath) {
      return res.status(400).json({ error: 'archivePath and filePath are required' });
    }

    // Use temporary extraction
    const tempDir = await archiveService.extractToTemp(archivePath, `extract_${Date.now()}`);
    const extractedFile = path.join(tempDir, filePath);

    if (!fs.existsSync(extractedFile)) {
      return res.status(404).json({ error: 'File not found in archive' });
    }

    // If outputPath specified, move file there
    if (outputPath) {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.renameSync(extractedFile, outputPath);
    }

    res.json({
      success: true,
      data: {
        extractedPath: outputPath || extractedFile,
        tempDir: !outputPath ? tempDir : undefined
      }
    });
  } catch (error: any) {
    console.error('Extract single error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /archives/cleanup
 * Clean up temporary files
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const { maxAgeMs } = req.body;
    const cleaned = await archiveService.cleanup(maxAgeMs);

    res.json({
      success: true,
      data: { cleaned }
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
