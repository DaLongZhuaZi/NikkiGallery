import { Router, Request, Response } from 'express';
import { BatchOperationService } from '../services/BatchOperationService';

const router = Router();
const batchService = BatchOperationService.getInstance();

/**
 * POST /batch/rename
 * Batch rename images
 */
router.post('/rename', async (req: Request, res: Response) => {
  try {
    const { imageIds, pattern, startNumber, padding, dateFormat, keepExtension } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds array is required' });
    }

    if (!pattern) {
      return res.status(400).json({ error: 'pattern is required' });
    }

    const result = await batchService.batchRename(imageIds, {
      pattern,
      startNumber,
      padding,
      dateFormat,
      keepExtension
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Batch rename error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /batch/move
 * Batch move/copy images to album
 */
router.post('/move', async (req: Request, res: Response) => {
  try {
    const { imageIds, targetAlbumId, copy, duplicateAction } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds array is required' });
    }

    if (!targetAlbumId) {
      return res.status(400).json({ error: 'targetAlbumId is required' });
    }

    const result = await batchService.batchMoveToAlbum(imageIds, {
      targetAlbumId,
      copy,
      duplicateAction
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Batch move error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /batch/tags
 * Batch manage tags
 */
router.post('/tags', async (req: Request, res: Response) => {
  try {
    const { imageIds, addTagIds, removeTagIds, replaceTagIds } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds array is required' });
    }

    const result = await batchService.batchManageTags(imageIds, {
      addTagIds,
      removeTagIds,
      replaceTagIds
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Batch tags error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /batch/export
 * Batch export images
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { imageIds, exportDir, includeMetadata, perAlbumDir, format, quality } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds array is required' });
    }

    if (!exportDir) {
      return res.status(400).json({ error: 'exportDir is required' });
    }

    const result = await batchService.batchExport(imageIds, {
      exportDir,
      includeMetadata,
      perAlbumDir,
      format,
      quality
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Batch export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /batch/favorite
 * Batch update favorite status
 */
router.post('/favorite', async (req: Request, res: Response) => {
  try {
    const { imageIds, favorite } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds array is required' });
    }

    if (typeof favorite !== 'boolean') {
      return res.status(400).json({ error: 'favorite must be a boolean' });
    }

    const result = await batchService.batchUpdateFavorite(imageIds, favorite);

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Batch favorite error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /batch/extract-metadata
 * Batch extract metadata
 */
router.post('/extract-metadata', async (req: Request, res: Response) => {
  try {
    const { imageIds } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds array is required' });
    }

    const result = await batchService.batchExtractMetadata(imageIds);

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Batch extract metadata error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /batch/thumbnails
 * Batch generate thumbnails
 */
router.post('/thumbnails', async (req: Request, res: Response) => {
  try {
    const { imageIds } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds array is required' });
    }

    const result = await batchService.batchGenerateThumbnails(imageIds);

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Batch thumbnails error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /batch/delete
 * Batch delete (move to trash)
 */
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const { imageIds, deleteFiles } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds array is required' });
    }

    const result = await batchService.batchDelete(imageIds, deleteFiles);

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Batch delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /batch/restore
 * Batch restore from trash
 */
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const { imageIds } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds array is required' });
    }

    const result = await batchService.batchRestore(imageIds);

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Batch restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
