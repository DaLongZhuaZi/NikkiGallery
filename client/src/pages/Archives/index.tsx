import React, { useState } from 'react';
import { useArchiveStore } from '../../stores/useArchiveStore';
import type { CompressResult, DecompressResult, ArchiveFileEntry } from '../../api/archives';
import './style.css';

const Archives: React.FC = () => {
  const {
    currentArchive,
    archiveFiles,
    selectedSources,
    isCompressing,
    isDecompressing,
    isLoadingInfo,
    lastCompressResult,
    lastDecompressResult,
    error,
    setSelectedSources,
    addSource,
    removeSource,
    clearSources,
    loadArchiveInfo,
    listContents,
    compress,
    decompress,
    clearResults,
    clearError
  } = useArchiveStore();

  const [mode, setMode] = useState<'compress' | 'decompress'>('compress');
  const [archivePath, setArchivePath] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [compressionLevel, setCompressionLevel] = useState(6);
  const [newSource, setNewSource] = useState('');

  // Handle compress
  const handleCompress = async () => {
    if (selectedSources.length === 0) {
      alert('请至少选择一个文件或目录');
      return;
    }
    try {
      await compress(selectedSources, outputPath || undefined, { level: compressionLevel });
    } catch (err) {
      // Error is handled in store
    }
  };

  // Handle decompress
  const handleDecompress = async () => {
    if (!archivePath) {
      alert('请输入压缩文件路径');
      return;
    }
    try {
      await decompress(archivePath, outputPath || undefined);
    } catch (err) {
      // Error is handled in store
    }
  };

  // Handle view archive info
  const handleViewInfo = async () => {
    if (!archivePath) {
      alert('请输入压缩文件路径');
      return;
    }
    await loadArchiveInfo(archivePath);
    await listContents(archivePath);
  };

  // Add source handler
  const handleAddSource = () => {
    if (newSource.trim()) {
      addSource(newSource.trim());
      setNewSource('');
    }
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="archives-page">
      <header className="archives-header">
        <h1>归档格式支持</h1>
        <p>ZIP 压缩和解压功能</p>
      </header>

      {/* Mode Selector */}
      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'compress' ? 'active' : ''}`}
          onClick={() => { setMode('compress'); clearResults(); }}
        >
          <span className="icon">📦</span>
          压缩文件
        </button>
        <button
          className={`mode-btn ${mode === 'decompress' ? 'active' : ''}`}
          onClick={() => { setMode('decompress'); clearResults(); }}
        >
          <span className="icon">📂</span>
          解压文件
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button className="error-close" onClick={clearError}>×</button>
        </div>
      )}

      <div className="archives-content">
        {/* Compress Mode */}
        {mode === 'compress' && (
          <div className="compress-section">
            <div className="section-card">
              <h3>选择要压缩的文件/目录</h3>
              
              <div className="source-input">
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="输入文件或目录路径..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                />
                <button onClick={handleAddSource} className="add-btn">
                  添加
                </button>
              </div>

              {selectedSources.length > 0 && (
                <div className="source-list">
                  {selectedSources.map((source, index) => (
                    <div key={index} className="source-item">
                      <span className="source-path">{source}</span>
                      <button
                        className="remove-btn"
                        onClick={() => removeSource(source)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button className="clear-btn" onClick={clearSources}>
                    清空全部
                  </button>
                </div>
              )}
            </div>

            <div className="section-card">
              <h3>压缩选项</h3>
              
              <div className="option-group">
                <label>输出路径（可选）</label>
                <input
                  type="text"
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  placeholder="留空则自动生成"
                />
              </div>

              <div className="option-group">
                <label>压缩级别: {compressionLevel}</label>
                <input
                  type="range"
                  min="0"
                  max="9"
                  value={compressionLevel}
                  onChange={(e) => setCompressionLevel(Number(e.target.value))}
                />
                <div className="range-labels">
                  <span>最快</span>
                  <span>最省空间</span>
                </div>
              </div>
            </div>

            <button
              className="action-btn primary"
              onClick={handleCompress}
              disabled={isCompressing || selectedSources.length === 0}
            >
              {isCompressing ? (
                <>
                  <span className="spinner"></span>
                  压缩中...
                </>
              ) : (
                <>
                  <span className="icon">📦</span>
                  开始压缩
                </>
              )}
            </button>
          </div>
        )}

        {/* Decompress Mode */}
        {mode === 'decompress' && (
          <div className="decompress-section">
            <div className="section-card">
              <h3>选择压缩文件</h3>
              
              <div className="option-group">
                <label>压缩文件路径</label>
                <input
                  type="text"
                  value={archivePath}
                  onChange={(e) => setArchivePath(e.target.value)}
                  placeholder="输入 ZIP 文件路径..."
                />
              </div>

              <div className="option-group">
                <label>解压目录（可选）</label>
                <input
                  type="text"
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  placeholder="留空则解压到临时目录"
                />
              </div>

              <button
                className="action-btn secondary"
                onClick={handleViewInfo}
                disabled={isLoadingInfo || !archivePath}
              >
                {isLoadingInfo ? '加载中...' : '查看内容'}
              </button>
            </div>

            {/* Archive Info */}
            {currentArchive && (
              <div className="section-card archive-info">
                <h3>压缩文件信息</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">文件名</span>
                    <span className="info-value">{currentArchive.fileName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">文件大小</span>
                    <span className="info-value">{currentArchive.sizeFormatted}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">包含文件</span>
                    <span className="info-value">{currentArchive.fileCount} 个</span>
                  </div>
                </div>
              </div>
            )}

            {/* File List */}
            {archiveFiles.length > 0 && (
              <div className="section-card">
                <h3>文件列表 ({archiveFiles.length})</h3>
                <div className="file-list">
                  {archiveFiles.map((file, index) => (
                    <div key={index} className={`file-item ${file.isDirectory ? 'directory' : ''}`}>
                      <span className="file-icon">
                        {file.isDirectory ? '📁' : '📄'}
                      </span>
                      <span className="file-path">{file.path}</span>
                      <span className="file-size">
                        {file.isDirectory ? '' : formatBytes(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="action-btn primary"
              onClick={handleDecompress}
              disabled={isDecompressing || !archivePath}
            >
              {isDecompressing ? (
                <>
                  <span className="spinner"></span>
                  解压中...
                </>
              ) : (
                <>
                  <span className="icon">📂</span>
                  开始解压
                </>
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {lastCompressResult && (
          <div className="section-card result-card success">
            <h3>✅ 压缩完成</h3>
            <div className="result-grid">
              <div className="result-item">
                <span className="result-label">输出文件</span>
                <span className="result-value">{lastCompressResult.fileName}</span>
              </div>
              <div className="result-item">
                <span className="result-label">文件数量</span>
                <span className="result-value">{lastCompressResult.fileCount} 个</span>
              </div>
              <div className="result-item">
                <span className="result-label">原始大小</span>
                <span className="result-value">{formatBytes(lastCompressResult.originalSize)}</span>
              </div>
              <div className="result-item">
                <span className="result-label">压缩后大小</span>
                <span className="result-value">{formatBytes(lastCompressResult.outputSize)}</span>
              </div>
              <div className="result-item">
                <span className="result-label">压缩率</span>
                <span className="result-value">
                  {(lastCompressResult.compressionRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">耗时</span>
                <span className="result-value">{formatDuration(lastCompressResult.duration)}</span>
              </div>
            </div>
          </div>
        )}

        {lastDecompressResult && (
          <div className="section-card result-card success">
            <h3>✅ 解压完成</h3>
            <div className="result-grid">
              <div className="result-item">
                <span className="result-label">解压目录</span>
                <span className="result-value">{lastDecompressResult.outputDir}</span>
              </div>
              <div className="result-item">
                <span className="result-label">文件数量</span>
                <span className="result-value">{lastDecompressResult.fileCount} 个</span>
              </div>
              <div className="result-item">
                <span className="result-label">总大小</span>
                <span className="result-value">{formatBytes(lastDecompressResult.totalSize)}</span>
              </div>
              <div className="result-item">
                <span className="result-label">耗时</span>
                <span className="result-value">{formatDuration(lastDecompressResult.duration)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Archives;
