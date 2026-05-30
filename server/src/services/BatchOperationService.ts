import * as fs from 'fs';
import * as path from 'path';
import { ImageService } from './ImageService';
import { AlbumService } from './AlbumService';
import { MetadataService } from './MetadataService';

export interface BatchRenameOptions {
  /** Naming pattern: {n} = number, {date} = date, {original} = original name, {album} = album name */
  pattern: string;
  /** Start number for {n} */
  startNumber?: number;
  /** Number padding (e.g., 3 = 001, 002) */
  padding?: number;
  /** Date format for {date} */
  dateFormat?: string;
  /** Whether to keep original extension */
  keepExtension?: boolean;
}

export interface BatchMoveOptions {
  /** Target album ID */
  targetAlbumId: string;
  /** Whether to copy instead of move */
  copy?: boolean;
  /** Handle duplicate names: 'skip' | 'rename' | 'overwrite' */
  duplicateAction?: 'skip' | 'rename' | 'overwrite';
}

export interface BatchExportOptions {
  /** Export directory */
  exportDir: string;
  /** Include metadata JSON file */
  includeMetadata?: boolean;
  /** Create subdirectory per album */
  perAlbumDir?: boolean;
  /** Export format (keep original or convert) */
  format?: 'original' | 'jpg' | 'png';
  /** Quality for JPG export (1-100) */
  quality?: number;
}

export interface BatchTagOptions {
  /** Tag IDs to add */
  addTagIds?: string[];
  /** Tag IDs to remove */
  removeTagIds?: string[];
  /** Replace all tags */
  replaceTagIds?: string[];
}

export interface BatchResult {
  /** Total items processed */
  total: number;
  /** Successfully processed */
  success: number;
  /** Failed */
  failed: number;
  /** Skipped */
  skipped: number;
  /** Error details */
  errors: Array<{ id: string; error: string }>;
  /** Results details */
  details?: any[];
}

export class BatchOperationService {
  private static instance: BatchOperationService;

  private constructor() {}

  static getInstance(): BatchOperationService {
    if (!BatchOperationService.instance) {
      BatchOperationService.instance = new BatchOperationService();
    }
    return BatchOperationService.instance;
  }

  /**
   * Batch rename images
   */
  async batchRename(
    imageIds: string[],
    options: BatchRenameOptions
  ): Promise<BatchResult> {
    const result: BatchResult = {
      total: imageIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      details: []
    };

    const startNum = options.startNumber ?? 1;
    const padding = options.padding ?? 3;
    const dateFormat = options.dateFormat ?? 'YYYYMMDD';
    const keepExt = options.keepExtension !== false;

    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      try {
        const image = await ImageService.getImageById(imageId);
        if (!image) {
          result.errors.push({ id: imageId, error: 'Image not found' });
          result.failed++;
          continue;
        }

        // Generate new name
        const ext = path.extname(image.filename);
        const baseName = this.generateName(options.pattern, {
          number: startNum + i,
          padding,
          date: image.createdAt ? new Date(image.createdAt) : new Date(),
          original: path.basename(image.filename, ext),
          album: image.albumId ? `album_${image.albumId}` : 'unknown',
          dateFormat
        });

        const newName = keepExt ? `${baseName}${ext}` : baseName;

        // Update in database
        await ImageService.updateImage(imageId, { filename: newName });

        result.success++;
        result.details?.push({
          id: imageId,
          oldName: image.filename,
          newName
        });
      } catch (error: any) {
        result.errors.push({ id: imageId, error: error.message });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Generate name from pattern
   */
  private generateName(
    pattern: string,
    params: {
      number: number;
      padding: number;
      date: Date;
      original: string;
      album: string;
      dateFormat: string;
    }
  ): string {
    let name = pattern;

    // Replace {n} with padded number
    name = name.replace(/\{n\}/g, String(params.number).padStart(params.padding, '0'));

    // Replace {date} with formatted date
    name = name.replace(/\{date\}/g, this.formatDate(params.date, params.dateFormat));

    // Replace {original} with original name
    name = name.replace(/\{original\}/g, params.original);

    // Replace {album} with album name
    name = name.replace(/\{album\}/g, params.album);

    // Replace {timestamp} with unix timestamp
    name = name.replace(/\{timestamp\}/g, String(Math.floor(params.date.getTime() / 1000)));

    return name;
  }

  /**
   * Format date
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Batch move/copy images to album
   */
  async batchMoveToAlbum(
    imageIds: string[],
    options: BatchMoveOptions
  ): Promise<BatchResult> {
    const result: BatchResult = {
      total: imageIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      details: []
    };

    // Verify target album exists
    const album = await AlbumService.getAlbumById(options.targetAlbumId);
    if (!album) {
      throw new Error(`Target album not found: ${options.targetAlbumId}`);
    }

    for (const imageId of imageIds) {
      try {
        const image = await ImageService.getImageById(imageId);
        if (!image) {
          result.errors.push({ id: imageId, error: 'Image not found' });
          result.failed++;
          continue;
        }

        // Move: update album ID
        await ImageService.updateImage(imageId, {
          albumId: options.targetAlbumId
        });

        result.success++;
        result.details?.push({
          id: imageId,
          action: 'moved',
          targetAlbum: options.targetAlbumId
        });
      } catch (error: any) {
        result.errors.push({ id: imageId, error: error.message });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Batch manage tags
   */
  async batchManageTags(
    imageIds: string[],
    options: BatchTagOptions
  ): Promise<BatchResult> {
    const result: BatchResult = {
      total: imageIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const imageId of imageIds) {
      try {
        if (options.replaceTagIds) {
          // Remove all existing tags first
          const existingTags = await ImageService.getImageTags(imageId);
          for (const tag of existingTags) {
            await ImageService.removeTag(imageId, tag.id);
          }
          // Add new tags
          for (const tagId of options.replaceTagIds) {
            await ImageService.addTag(imageId, tagId);
          }
        } else {
          if (options.addTagIds?.length) {
            for (const tagId of options.addTagIds) {
              await ImageService.addTag(imageId, tagId);
            }
          }
          if (options.removeTagIds?.length) {
            for (const tagId of options.removeTagIds) {
              await ImageService.removeTag(imageId, tagId);
            }
          }
        }

        result.success++;
      } catch (error: any) {
        result.errors.push({ id: imageId, error: error.message });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Batch export images
   */
  async batchExport(
    imageIds: string[],
    options: BatchExportOptions
  ): Promise<BatchResult> {
    const result: BatchResult = {
      total: imageIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      details: []
    };

    // Ensure export directory exists
    if (!fs.existsSync(options.exportDir)) {
      fs.mkdirSync(options.exportDir, { recursive: true });
    }

    for (const imageId of imageIds) {
      try {
        const image = await ImageService.getImageById(imageId);
        if (!image) {
          result.errors.push({ id: imageId, error: 'Image not found' });
          result.failed++;
          continue;
        }

        // Determine target directory
        let targetDir = options.exportDir;
        if (options.perAlbumDir && image.albumId) {
          const album = await AlbumService.getAlbumById(image.albumId);
          const albumName = album ? album.name : `album_${image.albumId}`;
          targetDir = path.join(options.exportDir, albumName);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
        }

        // Build source path from image data
        const sourcePath = image.path || path.join(
          process.cwd(), 'data', 'images', image.filename
        );
        const targetPath = path.join(targetDir, image.filename);

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);

          // Export metadata if requested
          if (options.includeMetadata) {
            const metadataPath = targetPath + '.json';
            fs.writeFileSync(metadataPath, JSON.stringify(image, null, 2));
          }

          result.success++;
          result.details?.push({
            id: imageId,
            exportedTo: targetPath
          });
        } else {
          result.errors.push({ id: imageId, error: 'Source file not found' });
          result.failed++;
        }
      } catch (error: any) {
        result.errors.push({ id: imageId, error: error.message });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Batch update favorite status
   */
  async batchUpdateFavorite(
    imageIds: string[],
    favorite: boolean
  ): Promise<BatchResult> {
    const result: BatchResult = {
      total: imageIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const imageId of imageIds) {
      try {
        await ImageService.updateImage(imageId, { favorite: favorite ? 1 : 0 });
        result.success++;
      } catch (error: any) {
        result.errors.push({ id: imageId, error: error.message });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Batch extract metadata
   */
  async batchExtractMetadata(imageIds: string[]): Promise<BatchResult> {
    const result: BatchResult = {
      total: imageIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      details: []
    };

    for (const imageId of imageIds) {
      try {
        const image = await ImageService.getImageById(imageId);
        if (!image) {
          result.errors.push({ id: imageId, error: 'Image not found' });
          result.failed++;
          continue;
        }

        const filePath = image.path || path.join(
          process.cwd(), 'data', 'images', image.filename
        );
        
        if (fs.existsSync(filePath)) {
          const success = await MetadataService.extractAndSaveMetadata(imageId);
          if (success) {
            result.success++;
            result.details?.push({
              id: imageId,
              status: 'success'
            });
          } else {
            result.failed++;
            result.errors.push({ id: imageId, error: 'Failed to extract metadata' });
          }
        } else {
          result.errors.push({ id: imageId, error: 'File not found' });
          result.failed++;
        }
      } catch (error: any) {
        result.errors.push({ id: imageId, error: error.message });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Batch generate thumbnails
   */
  async batchGenerateThumbnails(imageIds: string[]): Promise<BatchResult> {
    const result: BatchResult = {
      total: imageIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const imageId of imageIds) {
      try {
        await ImageService.generateThumbnail(imageId);
        result.success++;
      } catch (error: any) {
        result.errors.push({ id: imageId, error: error.message });
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Batch delete (move to trash)
   */
  async batchDelete(
    imageIds: string[],
    deleteFiles: boolean = false
  ): Promise<BatchResult> {
    const result: BatchResult = {
      total: imageIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const deleted = await ImageService.batchDeleteImages(imageIds, deleteFiles);
    result.success = deleted;
    result.failed = imageIds.length - deleted;

    return result;
  }

  /**
   * Batch restore from trash
   */
  async batchRestore(imageIds: string[]): Promise<BatchResult> {
    const result: BatchResult = {
      total: imageIds.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const restored = await ImageService.batchRestoreImages(imageIds);
    result.success = restored;
    result.failed = imageIds.length - restored;

    return result;
  }

  /**
   * Get operation progress (for future async implementation)
   */
  async getProgress(operationId: string): Promise<{
    status: 'running' | 'completed' | 'failed';
    progress: number;
    result?: BatchResult;
  }> {
    // Placeholder for future async operation tracking
    return {
      status: 'completed',
      progress: 100
    };
  }
}

export default BatchOperationService;
