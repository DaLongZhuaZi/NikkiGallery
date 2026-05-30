import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { decryptApi, DecryptCheckResult, BatchDecryptResult } from '@/api/decrypt'
import { Lock, Unlock, Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface DecryptPanelProps {
  /** 图片ID列表 */
  imageIds: string[]
  /** 解密完成回调 */
  onDecryptComplete?: () => void
}

export default function DecryptPanel({ imageIds, onDecryptComplete }: DecryptPanelProps) {
  const { scheme } = useTheme()

  // 状态
  const [uid, setUid] = useState<string>('')
  const [autoDetectUid, setAutoDetectUid] = useState(true)
  const [checking, setChecking] = useState(false)
  const [decrypting, setDecrypting] = useState(false)
  const [checkResults, setCheckResults] = useState<DecryptCheckResult[]>([])
  const [decryptResults, setDecryptResults] = useState<BatchDecryptResult | null>(null)

  // 自动检测UID
  useEffect(() => {
    if (autoDetectUid) {
      detectUid()
    }
  }, [autoDetectUid])

  const detectUid = async () => {
    try {
      const result = await decryptApi.findUid()
      if (result.uid) {
        setUid(result.uid)
        toast.success('已自动检测到用户UID')
      } else {
        toast('未检测到UID，请手动输入', { icon: '⚠️' })
      }
    } catch (error) {
      console.error('Failed to detect UID:', error)
    }
  }

  // 检查加密状态
  const handleCheck = async () => {
    if (imageIds.length === 0) {
      toast.error('请先选择图片')
      return
    }

    setChecking(true)
    setCheckResults([])

    try {
      const results: DecryptCheckResult[] = []

      // 逐个检查（最多检查前10张）
      const checkCount = Math.min(imageIds.length, 10)
      for (let i = 0; i < checkCount; i++) {
        try {
          const result = await decryptApi.checkEncrypted(imageIds[i])
          results.push(result)
        } catch (error) {
          results.push({
            imageId: imageIds[i],
            hasEncryptedData: false,
            filename: 'unknown',
          })
        }
      }

      setCheckResults(results)

      const encryptedCount = results.filter(r => r.hasEncryptedData).length
      if (encryptedCount > 0) {
        toast.success(`检测完成：${encryptedCount}/${results.length} 张图片包含加密数据`)
      } else {
        toast('所选图片不包含加密数据', { icon: 'ℹ️' })
      }
    } catch (error) {
      toast.error('检测失败')
    } finally {
      setChecking(false)
    }
  }

  // 执行解密
  const handleDecrypt = async () => {
    if (imageIds.length === 0) {
      toast.error('请先选择图片')
      return
    }

    if (!uid) {
      toast.error('请输入用户UID')
      return
    }

    setDecrypting(true)
    setDecryptResults(null)

    try {
      const result = await decryptApi.batchDecrypt(imageIds, uid)
      setDecryptResults(result)

      if (result.success > 0) {
        toast.success(`解密完成：${result.success} 成功，${result.failed} 失败`)
        onDecryptComplete?.()
      } else {
        toast.error('解密失败')
      }
    } catch (error) {
      toast.error('解密过程中发生错误')
    } finally {
      setDecrypting(false)
    }
  }

  return (
    <div
      className="p-4 rounded-xl"
      style={{ background: scheme.bgCard }}
    >
      <h3
        className="text-sm font-medium mb-4 flex items-center gap-2"
        style={{ color: scheme.textPrimary }}
      >
        <Lock className="w-4 h-4" />
        游戏图像解密
      </h3>

      {/* UID 输入 */}
      <div className="mb-4">
        <label className="text-xs mb-2 block" style={{ color: scheme.textTertiary }}>
          用户UID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="输入游戏UID"
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              background: scheme.bgHover,
              color: scheme.textPrimary,
              border: `1px solid ${scheme.borderLight}`,
            }}
          />
          <button
            onClick={detectUid}
            className="px-3 py-2 rounded-lg text-sm flex items-center gap-1.5"
            style={{
              background: scheme.bgHover,
              color: scheme.textSecondary,
            }}
          >
            <RefreshCw className="w-4 h-4" />
            自动检测
          </button>
        </div>
        <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>
          UID用于派生解密密钥，可在游戏设置或截图元数据中找到
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleCheck}
          disabled={checking || imageIds.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200"
          style={{
            background: scheme.bgHover,
            color: scheme.textSecondary,
            opacity: checking || imageIds.length === 0 ? 0.6 : 1,
          }}
        >
          {checking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          检测加密
        </button>

        <button
          onClick={handleDecrypt}
          disabled={decrypting || !uid || imageIds.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200"
          style={{
            background: scheme.primary,
            color: '#ffffff',
            opacity: decrypting || !uid || imageIds.length === 0 ? 0.6 : 1,
          }}
        >
          {decrypting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
          解密图片
        </button>
      </div>

      {/* 检测结果 */}
      {checkResults.length > 0 && (
        <div
          className="p-3 rounded-lg mb-4"
          style={{ background: scheme.bgHover }}
        >
          <h4 className="text-xs font-medium mb-2" style={{ color: scheme.textSecondary }}>
            检测结果
          </h4>
          <div className="space-y-1">
            {checkResults.map((result) => (
              <div
                key={result.imageId}
                className="flex items-center gap-2 text-xs"
                style={{ color: scheme.textSecondary }}
              >
                {result.hasEncryptedData ? (
                  <Lock className="w-3 h-3" style={{ color: scheme.warning }} />
                ) : (
                  <CheckCircle className="w-3 h-3" style={{ color: scheme.success }} />
                )}
                <span className="truncate">{result.filename}</span>
                <span style={{ color: scheme.textTertiary }}>
                  {result.hasEncryptedData ? '已加密' : '未加密'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 解密结果 */}
      {decryptResults && (
        <div
          className="p-3 rounded-lg"
          style={{ background: scheme.bgHover }}
        >
          <h4 className="text-xs font-medium mb-2" style={{ color: scheme.textSecondary }}>
            解密结果
          </h4>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: scheme.textPrimary }}>
                {decryptResults.total}
              </p>
              <p className="text-xs" style={{ color: scheme.textTertiary }}>总计</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: scheme.success }}>
                {decryptResults.success}
              </p>
              <p className="text-xs" style={{ color: scheme.textTertiary }}>成功</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: scheme.error }}>
                {decryptResults.failed}
              </p>
              <p className="text-xs" style={{ color: scheme.textTertiary }}>失败</p>
            </div>
          </div>

          {/* 失败详情 */}
          {decryptResults.results.some(r => !r.success) && (
            <div className="mt-2 space-y-1">
              {decryptResults.results
                .filter(r => !r.success)
                .map((result) => (
                  <div
                    key={result.imageId}
                    className="flex items-center gap-2 text-xs"
                    style={{ color: scheme.error }}
                  >
                    <XCircle className="w-3 h-3" />
                    <span>{result.error}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 提示信息 */}
      <div
        className="mt-4 p-3 rounded-lg text-xs"
        style={{
          background: scheme.primaryLight + '20',
          color: scheme.textSecondary,
        }}
      >
        <p className="font-medium mb-1" style={{ color: scheme.primary }}>
          关于游戏图像解密
        </p>
        <ul className="space-y-1 list-disc list-inside">
          <li>无限暖暖游戏截图包含加密的拍摄参数数据</li>
          <li>解密需要用户UID来派生密钥</li>
          <li>解密后的数据包含相机参数、位置信息等</li>
          <li>并非所有截图都包含加密数据</li>
        </ul>
      </div>
    </div>
  )
}
