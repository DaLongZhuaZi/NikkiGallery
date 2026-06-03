import { useState } from 'react'
import { X, Wand2, Loader2, Save } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useShareStore } from '@/stores/useShareStore'
import { ShareCode } from '@/types/share'
import toast from 'react-hot-toast'

interface ShareCodeModalProps {
  onClose: () => void
}

export default function ShareCodeModal({ onClose }: ShareCodeModalProps) {
  const { scheme } = useTheme()
  const { createShareCode } = useShareStore()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    type: 'dye' as ShareCode['type'],
    name: '',
    description: '',
  })
  
  const [parsedData, setParsedData] = useState<string | null>(null)

  const types = [
    { value: 'dye', label: '染色码' },
    { value: 'home', label: '家园码' },
    { value: 'camera', label: '相机码' },
    { value: 'diy', label: 'DIY码' },
    { value: 'combo', label: '套装码' },
  ]

  const handleParse = () => {
    if (!formData.code) {
      toast.error('请先输入分享码')
      return
    }
    
    try {
      // 基础 Base64 解码尝试
      const decoded = atob(formData.code)
      // 过滤出可打印的 ASCII 字符，以便寻找明文特征（例如角色名、时间戳等）
      const printable = decoded.replace(/[^\x20-\x7E]/g, ' ')
      // 移除多余空格
      const cleaned = printable.replace(/\s+/g, ' ').trim()
      
      if (cleaned.length > 0) {
        setParsedData(cleaned)
        toast.success('解析成功，已提取出明文片段')
      } else {
        setParsedData('该分享码似乎是纯二进制数据，无明文特征。')
      }
    } catch (e) {
      try {
        // 如果不是 Base64，尝试看是不是 Hex
        if (/^[0-9a-fA-F]+$/.test(formData.code)) {
          let str = ''
          for (let i = 0; i < formData.code.length; i += 2) {
            str += String.fromCharCode(parseInt(formData.code.substring(i, i + 2), 16))
          }
          const printable = str.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim()
          setParsedData(printable || '纯十六进制数据，无明文特征。')
          toast.success('解析为 Hex 成功')
          return
        }
      } catch (err) {}
      
      setParsedData('无法识别该分享码的编码格式（既不是标准 Base64 也不是 Hex）')
      toast.error('解析失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim()) {
      toast.error('分享码内容不能为空')
      return
    }
    
    setLoading(true)
    try {
      await createShareCode(formData)
      toast.success('添加成功')
      onClose()
    } catch (err: any) {
      // 错误已在 store 中处理，此处可忽略
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: scheme.bgCard }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: scheme.borderLight }}>
          <h2 className="text-lg font-bold" style={{ color: scheme.textPrimary }}>添加分享码</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors" style={{ color: scheme.textSecondary }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="share-code-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: scheme.textPrimary }}>
                分享码内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 rounded-xl text-sm transition-all outline-none resize-none h-24"
                style={{ backgroundColor: scheme.bgInput, border: `1px solid ${scheme.borderLight}`, color: scheme.textPrimary }}
                onFocus={e => (e.target.style.borderColor = scheme.primary)}
                onBlur={e => (e.target.style.borderColor = scheme.borderLight)}
                placeholder="在此粘贴游戏内复制的分享码..."
                required
              />
              <button 
                type="button" 
                onClick={handleParse}
                className="mt-2 text-sm flex items-center gap-1 hover:underline"
                style={{ color: scheme.primary }}
              >
                <Wand2 className="w-4 h-4" /> 尝试解析明文内容
              </button>
              
              {parsedData && (
                <div className="mt-3 p-3 rounded-lg text-xs break-all" style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: scheme.textSecondary }}>
                  <strong>解析结果预览：</strong>
                  <div className="mt-1 font-mono leading-relaxed">{parsedData}</div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: scheme.textPrimary }}>分享码类型</label>
              <div className="grid grid-cols-3 gap-2">
                {types.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t.value as any })}
                    className="py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: formData.type === t.value ? scheme.primary : scheme.bgInput,
                      color: formData.type === t.value ? '#fff' : scheme.textSecondary,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: scheme.textPrimary }}>名称（可选）</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl text-sm transition-all outline-none"
                style={{ backgroundColor: scheme.bgInput, border: `1px solid ${scheme.borderLight}`, color: scheme.textPrimary }}
                onFocus={e => (e.target.style.borderColor = scheme.primary)}
                onBlur={e => (e.target.style.borderColor = scheme.borderLight)}
                placeholder="例如：蓝色星空裙"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: scheme.textPrimary }}>备注（可选）</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-xl text-sm transition-all outline-none resize-none h-16"
                style={{ backgroundColor: scheme.bgInput, border: `1px solid ${scheme.borderLight}`, color: scheme.textPrimary }}
                onFocus={e => (e.target.style.borderColor = scheme.primary)}
                onBlur={e => (e.target.style.borderColor = scheme.borderLight)}
                placeholder="添加一些描述说明..."
              />
            </div>
          </form>
        </div>

        <div className="p-4 border-t flex justify-end gap-3" style={{ borderColor: scheme.borderLight }}>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ backgroundColor: scheme.bgHover, color: scheme.textSecondary }}
          >
            取消
          </button>
          <button
            type="submit"
            form="share-code-form"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            style={{ backgroundColor: scheme.primary, color: '#fff' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
