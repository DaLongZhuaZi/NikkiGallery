import axios from 'axios';

const api = axios.create({
  baseURL: '/api/batch',
  timeout: 300000, // 5 minutes for large batch operations
});

export interface BatchRenameOptions {
  /** Naming pattern: {n} = number, {date} = date, {original} = original name */
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
  targetAlbumId: number;
  /** Whether to copy instead of move */
  copy?: boolean;
  /** Handle duplicate names */
  duplicateAction?: 'skip' | 'rename' | 'overwrite';
}

export interface BatchExportOptions {
  /** Export directory */
  exportDir: string;
  /** Include metadata JSON file */
  includeMetadata?: boolean;
  /** Create subdirectory per album */
  perAlbumDir?: boolean;
  /** Export format */
  format?: 'original' | 'jpg' | 'png';
  /** Quality for JPG export */
  quality?: number;
}

export interface BatchTagOptions {
  /** Tag IDs to add */
  addTagIds?: number[];
  /** Tag IDs to remove */
  removeTagIds?: number[];
  /** Replace all tags */
  replaceTagIds?: number[];
}

export interface BatchResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: number; error: string }>;
  details?: any[];
}

/**
 * Batch rename images
 */
export async function batchRename(
  imageIds: number[],
  options: BatchRenameOptions
): Promise<BatchResult> {
  const response = await api.post('/rename', { imageIds, ...options });
  return response.data.data;
}

/**
 * Batch move/copy images to album
 */
export async function batchMove(
  imageIds: number[],
  options: BatchMoveOptions
): Promise<BatchResult> {
  const response = await api.post('/move', { imageIds, ...options });
  return response.data.data;
}

/**
 * Batch manage tags
 */
export async function batchTags(
  imageIds: number[],
  options: BatchTagOptions
): Promise<BatchResult> {
  const response = await api.post('/tags', { imageIds, ...options });
  return response.data.data;
}

/**
 * Batch export images
 */
export async function batchExport(
  imageIds: number[],
  options: BatchExportOptions
): Promise<BatchResult> {
  const response = await api.post('/export', { imageIds, ...options });
  return response.data.data;
}

/**
 * Batch update favorite status
 */
export async function batchFavorite(
  imageIds: number[],
  favorite: boolean
): Promise<BatchResult> {
  const response = await api.post('/favorite', { imageIds, favorite });
  return response.data.data;
}

/**
 * Batch extract metadata
 */
export async function batchExtractMetadata(imageIds: number[]): Promise<BatchResult> {
  const response = await api.post('/extract-metadata', { imageIds });
  return response.data.data;
}

/**
 * Batch generate thumbnails
 */
export async function batchGenerateThumbnails(imageIds: number[]): Promise<BatchResult> {
  const response = await api.post('/thumbnails', { imageIds });
  return response.data.data;
}

/**
 * Batch delete (move to trash)
 */
export async function batchDelete(
  imageIds: number[],
  deleteFiles?: boolean
): Promise<BatchResult> {
  const response = await api.post('/delete', { imageIds, deleteFiles });
  return response.data.data;
}

/**
 * Batch restore from trash
 */
export async function batchRestore(imageIds: number[]): Promise<BatchResult> {
  const response = await api.post('/restore', { imageIds });
  return response.data.data;
}
