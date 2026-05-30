import { create } from 'zustand';
import * as batchApi from '../api/batch';
import type { BatchResult, BatchRenameOptions, BatchMoveOptions, BatchExportOptions, BatchTagOptions } from '../api/batch';

interface BatchState {
  // Selected image IDs
  selectedImageIds: number[];
  
  // Processing state
  isProcessing: boolean;
  currentOperation: string | null;
  
  // Results
  lastResult: BatchResult | null;
  
  // Error
  error: string | null;
  
  // Actions
  setSelectedImages: (ids: number[]) => void;
  addSelectedImage: (id: number) => void;
  removeSelectedImage: (id: number) => void;
  toggleSelectedImage: (id: number) => void;
  clearSelection: () => void;
  selectAll: (ids: number[]) => void;
  
  // Batch operations
  batchRename: (options: BatchRenameOptions) => Promise<BatchResult>;
  batchMove: (options: BatchMoveOptions) => Promise<BatchResult>;
  batchTags: (options: BatchTagOptions) => Promise<BatchResult>;
  batchExport: (options: BatchExportOptions) => Promise<BatchResult>;
  batchFavorite: (favorite: boolean) => Promise<BatchResult>;
  batchDelete: (deleteFiles?: boolean) => Promise<BatchResult>;
  batchRestore: () => Promise<BatchResult>;
  batchExtractMetadata: () => Promise<BatchResult>;
  batchGenerateThumbnails: () => Promise<BatchResult>;
  
  clearResult: () => void;
  clearError: () => void;
}

export const useBatchStore = create<BatchState>((set, get) => ({
  selectedImageIds: [],
  isProcessing: false,
  currentOperation: null,
  lastResult: null,
  error: null,

  setSelectedImages: (ids) => set({ selectedImageIds: ids }),
  
  addSelectedImage: (id) => {
    const { selectedImageIds } = get();
    if (!selectedImageIds.includes(id)) {
      set({ selectedImageIds: [...selectedImageIds, id] });
    }
  },
  
  removeSelectedImage: (id) => {
    set({ selectedImageIds: get().selectedImageIds.filter(i => i !== id) });
  },
  
  toggleSelectedImage: (id) => {
    const { selectedImageIds } = get();
    if (selectedImageIds.includes(id)) {
      set({ selectedImageIds: selectedImageIds.filter(i => i !== id) });
    } else {
      set({ selectedImageIds: [...selectedImageIds, id] });
    }
  },
  
  clearSelection: () => set({ selectedImageIds: [] }),
  
  selectAll: (ids) => set({ selectedImageIds: ids }),

  batchRename: async (options) => {
    const { selectedImageIds } = get();
    if (selectedImageIds.length === 0) {
      throw new Error('请先选择图片');
    }

    set({ isProcessing: true, currentOperation: 'rename', error: null });
    try {
      const result = await batchApi.batchRename(selectedImageIds, options);
      set({ lastResult: result, isProcessing: false, currentOperation: null });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '批量重命名失败';
      set({ error: errorMsg, isProcessing: false, currentOperation: null });
      throw new Error(errorMsg);
    }
  },

  batchMove: async (options) => {
    const { selectedImageIds } = get();
    if (selectedImageIds.length === 0) {
      throw new Error('请先选择图片');
    }

    set({ isProcessing: true, currentOperation: 'move', error: null });
    try {
      const result = await batchApi.batchMove(selectedImageIds, options);
      set({ lastResult: result, isProcessing: false, currentOperation: null });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '批量移动失败';
      set({ error: errorMsg, isProcessing: false, currentOperation: null });
      throw new Error(errorMsg);
    }
  },

  batchTags: async (options) => {
    const { selectedImageIds } = get();
    if (selectedImageIds.length === 0) {
      throw new Error('请先选择图片');
    }

    set({ isProcessing: true, currentOperation: 'tags', error: null });
    try {
      const result = await batchApi.batchTags(selectedImageIds, options);
      set({ lastResult: result, isProcessing: false, currentOperation: null });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '批量标签操作失败';
      set({ error: errorMsg, isProcessing: false, currentOperation: null });
      throw new Error(errorMsg);
    }
  },

  batchExport: async (options) => {
    const { selectedImageIds } = get();
    if (selectedImageIds.length === 0) {
      throw new Error('请先选择图片');
    }

    set({ isProcessing: true, currentOperation: 'export', error: null });
    try {
      const result = await batchApi.batchExport(selectedImageIds, options);
      set({ lastResult: result, isProcessing: false, currentOperation: null });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '批量导出失败';
      set({ error: errorMsg, isProcessing: false, currentOperation: null });
      throw new Error(errorMsg);
    }
  },

  batchFavorite: async (favorite) => {
    const { selectedImageIds } = get();
    if (selectedImageIds.length === 0) {
      throw new Error('请先选择图片');
    }

    set({ isProcessing: true, currentOperation: 'favorite', error: null });
    try {
      const result = await batchApi.batchFavorite(selectedImageIds, favorite);
      set({ lastResult: result, isProcessing: false, currentOperation: null });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '批量收藏操作失败';
      set({ error: errorMsg, isProcessing: false, currentOperation: null });
      throw new Error(errorMsg);
    }
  },

  batchDelete: async (deleteFiles) => {
    const { selectedImageIds } = get();
    if (selectedImageIds.length === 0) {
      throw new Error('请先选择图片');
    }

    set({ isProcessing: true, currentOperation: 'delete', error: null });
    try {
      const result = await batchApi.batchDelete(selectedImageIds, deleteFiles);
      set({ lastResult: result, isProcessing: false, currentOperation: null });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '批量删除失败';
      set({ error: errorMsg, isProcessing: false, currentOperation: null });
      throw new Error(errorMsg);
    }
  },

  batchRestore: async () => {
    const { selectedImageIds } = get();
    if (selectedImageIds.length === 0) {
      throw new Error('请先选择图片');
    }

    set({ isProcessing: true, currentOperation: 'restore', error: null });
    try {
      const result = await batchApi.batchRestore(selectedImageIds);
      set({ lastResult: result, isProcessing: false, currentOperation: null });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '批量恢复失败';
      set({ error: errorMsg, isProcessing: false, currentOperation: null });
      throw new Error(errorMsg);
    }
  },

  batchExtractMetadata: async () => {
    const { selectedImageIds } = get();
    if (selectedImageIds.length === 0) {
      throw new Error('请先选择图片');
    }

    set({ isProcessing: true, currentOperation: 'metadata', error: null });
    try {
      const result = await batchApi.batchExtractMetadata(selectedImageIds);
      set({ lastResult: result, isProcessing: false, currentOperation: null });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '批量提取元数据失败';
      set({ error: errorMsg, isProcessing: false, currentOperation: null });
      throw new Error(errorMsg);
    }
  },

  batchGenerateThumbnails: async () => {
    const { selectedImageIds } = get();
    if (selectedImageIds.length === 0) {
      throw new Error('请先选择图片');
    }

    set({ isProcessing: true, currentOperation: 'thumbnails', error: null });
    try {
      const result = await batchApi.batchGenerateThumbnails(selectedImageIds);
      set({ lastResult: result, isProcessing: false, currentOperation: null });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '批量生成缩略图失败';
      set({ error: errorMsg, isProcessing: false, currentOperation: null });
      throw new Error(errorMsg);
    }
  },

  clearResult: () => set({ lastResult: null }),
  clearError: () => set({ error: null })
}));
