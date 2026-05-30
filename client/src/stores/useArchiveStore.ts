import { create } from 'zustand';
import * as archiveApi from '../api/archives';
import type { ArchiveInfo, ArchiveFileEntry, CompressResult, DecompressResult } from '../api/archives';

interface ArchiveState {
  // Current archive info
  currentArchive: ArchiveInfo | null;
  archiveFiles: ArchiveFileEntry[];
  
  // Selected files for compression
  selectedSources: string[];
  
  // Processing state
  isCompressing: boolean;
  isDecompressing: boolean;
  isLoadingInfo: boolean;
  
  // Results
  lastCompressResult: CompressResult | null;
  lastDecompressResult: DecompressResult | null;
  
  // Error
  error: string | null;
  
  // Actions
  setSelectedSources: (sources: string[]) => void;
  addSource: (source: string) => void;
  removeSource: (source: string) => void;
  clearSources: () => void;
  
  loadArchiveInfo: (archivePath: string) => Promise<void>;
  listContents: (archivePath: string) => Promise<void>;
  
  compress: (sources: string[], outputPath?: string, options?: archiveApi.CompressOptions) => Promise<CompressResult>;
  decompress: (archivePath: string, outputDir?: string, options?: archiveApi.DecompressOptions) => Promise<DecompressResult>;
  
  clearResults: () => void;
  clearError: () => void;
}

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  currentArchive: null,
  archiveFiles: [],
  selectedSources: [],
  isCompressing: false,
  isDecompressing: false,
  isLoadingInfo: false,
  lastCompressResult: null,
  lastDecompressResult: null,
  error: null,

  setSelectedSources: (sources) => set({ selectedSources: sources }),
  
  addSource: (source) => {
    const { selectedSources } = get();
    if (!selectedSources.includes(source)) {
      set({ selectedSources: [...selectedSources, source] });
    }
  },
  
  removeSource: (source) => {
    set({ selectedSources: get().selectedSources.filter(s => s !== source) });
  },
  
  clearSources: () => set({ selectedSources: [] }),

  loadArchiveInfo: async (archivePath) => {
    set({ isLoadingInfo: true, error: null });
    try {
      const info = await archiveApi.getInfo(archivePath);
      set({ currentArchive: info, isLoadingInfo: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || error.message || 'Failed to load archive info',
        isLoadingInfo: false 
      });
    }
  },

  listContents: async (archivePath) => {
    set({ isLoadingInfo: true, error: null });
    try {
      const files = await archiveApi.listContents(archivePath);
      set({ archiveFiles: files, isLoadingInfo: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || error.message || 'Failed to list archive contents',
        isLoadingInfo: false 
      });
    }
  },

  compress: async (sources, outputPath, options) => {
    set({ isCompressing: true, error: null });
    try {
      const result = await archiveApi.compress(sources, outputPath, options);
      set({ 
        lastCompressResult: result,
        isCompressing: false 
      });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Compression failed';
      set({ error: errorMsg, isCompressing: false });
      throw new Error(errorMsg);
    }
  },

  decompress: async (archivePath, outputDir, options) => {
    set({ isDecompressing: true, error: null });
    try {
      const result = await archiveApi.decompress(archivePath, outputDir, options);
      set({ 
        lastDecompressResult: result,
        isDecompressing: false 
      });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Decompression failed';
      set({ error: errorMsg, isDecompressing: false });
      throw new Error(errorMsg);
    }
  },

  clearResults: () => set({
    lastCompressResult: null,
    lastDecompressResult: null,
    currentArchive: null,
    archiveFiles: []
  }),

  clearError: () => set({ error: null })
}));
