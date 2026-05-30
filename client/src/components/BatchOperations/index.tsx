import React, { useState } from 'react';
import { useBatchStore } from '../../stores/useBatchStore';
import type { BatchRenameOptions, BatchMoveOptions, BatchExportOptions } from '../../api/batch';
import './style.css';

interface BatchOperationsProps {
  /** Album list for move operation */
  albums?: Array<{ id: number; name: string }>;
  /** Callback when operation completes */
  onComplete?: (result: any) => void;
}

const BatchOperations: React.FC<BatchOperationsProps> = ({ albums = [], onComplete }) => {
  const {
    selectedImageIds,
    isProcessing,
    currentOperation,
    lastResult,
    error,
    clearSelection,
    batchRename,
    batchMove,
    batchFavorite,
    batchDelete,
    batchExtractMetadata,
    batchGenerateThumbnails,
    clearResult,
    clearError
  } = useBatchStore();

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Rename options
  const [renamePattern, setRenamePattern] = useState('{original}_{n}');
  const [startNumber, setStartNumber] = useState(1);
  const [padding, setPadding] = useState(3);

  // Move options
  const [targetAlbum, setTargetAlbum] = useState<number>(0);
  const [copyMode, setCopyMode] = useState(false);

  // Export options
  const [exportDir, setExportDir] = useState('');
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [perAlbumDir, setPerAlbumDir] = useState(false);

  const selectionCount = selectedImageIds.length;

  if (selectionCount === 0) {
    return null;
  }

  // Handle rename
  const handleRename = async () => {
    try {
      const result = await batchRename({
        pattern: renamePattern,
        startNumber,
        padding
      });
      setShowRenameDialog(false);
      onComplete?.(result);
    } catch (err) {
      // Error handled in store
    }
  };

  // Handle move
  const handleMove = async () => {
    if (!targetAlbum) {
      alert('请选择目标相册');
      return;
    }
    try {
      const result = await batchMove({
        targetAlbumId: targetAlbum,
        copy: copyMode
      });
      setShowMoveDialog(false);
      onComplete?.(result);
    } catch (err) {
      // Error handled in store
    }
  };

  // Handle favorite
  const handleFavorite = async (favorite: boolean) => {
    try {
      const result = await batchFavorite(favorite);
      onComplete?.(result);
    } catch (err) {
      // Error handled in store
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectionCount} 张图片吗？`)) {
      return;
    }
    try {
      const result = await batchDelete(false);
      onComplete?.(result);
    } catch (err) {
      // Error handled in store
    }
  };

  // Handle extract metadata
  const handleExtractMetadata = async () => {
    try {
      const result = await batchExtractMetadata();
      onComplete?.(result);
    } catch (err) {
      // Error handled in store
    }
  };

  // Handle generate thumbnails
  const handleGenerateThumbnails = async () => {
    try {
      const result = await batchGenerateThumbnails();
      onComplete?.(result);
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <div className="batch-operations">
      {/* Selection Info */}
      <div className="batch-header">
        <div className="selection-info">
          <span className="selection-count">{selectionCount}</span>
          <span className="selection-text">张图片已选中</span>
        </div>
        <button className="clear-selection-btn" onClick={clearSelection}>
          取消选择
        </button>
      </div>

      {/* Action Buttons */}
      <div className="batch-actions">
        <button
          className="batch-btn"
          onClick={() => setShowRenameDialog(true)}
          disabled={isProcessing}
        >
          <span className="btn-icon">✏️</span>
          批量重命名
        </button>

        <button
          className="batch-btn"
          onClick={() => setShowMoveDialog(true)}
          disabled={isProcessing}
        >
          <span className="btn-icon">📁</span>
          移动到相册
        </button>

        <button
          className="batch-btn"
          onClick={() => handleFavorite(true)}
          disabled={isProcessing}
        >
          <span className="btn-icon">⭐</span>
          批量收藏
        </button>

        <button
          className="batch-btn"
          onClick={() => handleFavorite(false)}
          disabled={isProcessing}
        >
          <span className="btn-icon">☆</span>
          取消收藏
        </button>

        <button
          className="batch-btn"
          onClick={handleGenerateThumbnails}
          disabled={isProcessing}
        >
          <span className="btn-icon">🖼️</span>
          生成缩略图
        </button>

        <button
          className="batch-btn"
          onClick={handleExtractMetadata}
          disabled={isProcessing}
        >
          <span className="btn-icon">📋</span>
          提取元数据
        </button>

        <button
          className="batch-btn danger"
          onClick={handleDelete}
          disabled={isProcessing}
        >
          <span className="btn-icon">🗑️</span>
          删除
        </button>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="batch-processing">
          <div className="processing-spinner"></div>
          <span>正在执行: {currentOperation}</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="batch-error">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* Result Display */}
      {lastResult && (
        <div className="batch-result">
          <div className="result-summary">
            <span className="result-success">成功: {lastResult.success}</span>
            <span className="result-failed">失败: {lastResult.failed}</span>
            {lastResult.skipped > 0 && (
              <span className="result-skipped">跳过: {lastResult.skipped}</span>
            )}
          </div>
          {lastResult.errors.length > 0 && (
            <div className="result-errors">
              {lastResult.errors.slice(0, 3).map((err, i) => (
                <div key={i} className="error-item">
                  ID {err.id}: {err.error}
                </div>
              ))}
              {lastResult.errors.length > 3 && (
                <div className="error-more">
                  还有 {lastResult.errors.length - 3} 个错误...
                </div>
              )}
            </div>
          )}
          <button className="result-close" onClick={clearResult}>关闭</button>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>批量重命名</h3>
            <div className="dialog-content">
              <div className="form-group">
                <label>命名模式</label>
                <input
                  type="text"
                  value={renamePattern}
                  onChange={(e) => setRenamePattern(e.target.value)}
                  placeholder="{original}_{n}"
                />
                <div className="pattern-help">
                  <span>{'{n}'} = 序号</span>
                  <span>{'{original}'} = 原文件名</span>
                  <span>{'{date}'} = 日期</span>
                  <span>{'{album}'} = 相册名</span>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>起始序号</label>
                  <input
                    type="number"
                    value={startNumber}
                    onChange={(e) => setStartNumber(Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>序号位数</label>
                  <input
                    type="number"
                    value={padding}
                    onChange={(e) => setPadding(Number(e.target.value))}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
              <div className="preview">
                预览: {renamePattern
                  .replace('{original}', 'IMG_001')
                  .replace('{n}', String(startNumber).padStart(padding, '0'))
                  .replace('{date}', '20260530')
                  .replace('{album}', '我的相册')
                }.jpg
              </div>
            </div>
            <div className="dialog-actions">
              <button className="cancel-btn" onClick={() => setShowRenameDialog(false)}>取消</button>
              <button className="confirm-btn" onClick={handleRename} disabled={isProcessing}>
                {isProcessing ? '处理中...' : '确认重命名'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Dialog */}
      {showMoveDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>移动到相册</h3>
            <div className="dialog-content">
              <div className="form-group">
                <label>目标相册</label>
                <select
                  value={targetAlbum}
                  onChange={(e) => setTargetAlbum(Number(e.target.value))}
                >
                  <option value={0}>请选择相册</option>
                  {albums.map(album => (
                    <option key={album.id} value={album.id}>{album.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={copyMode}
                    onChange={(e) => setCopyMode(e.target.checked)}
                  />
                  复制模式（保留原文件）
                </label>
              </div>
            </div>
            <div className="dialog-actions">
              <button className="cancel-btn" onClick={() => setShowMoveDialog(false)}>取消</button>
              <button className="confirm-btn" onClick={handleMove} disabled={isProcessing}>
                {isProcessing ? '处理中...' : copyMode ? '复制' : '移动'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchOperations;
