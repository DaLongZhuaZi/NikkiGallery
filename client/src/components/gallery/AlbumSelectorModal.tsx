import { useState, useEffect } from 'react'
import { X, Folder, Loader2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Album } from '@/types/album'
import { getAlbums } from '@/api/album'

interface AlbumSelectorModalProps {
  onClose: () => void
  onSelect: (albumId: string) => void
  title?: string
}

export default function AlbumSelectorModal({ onClose, onSelect, title = '选择目标相册' }: AlbumSelectorModalProps) {
  const { scheme } = useTheme()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAlbums().then(res => {
      setAlbums(res)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200"
        style={{ backgroundColor: scheme.bgCard, border: `1px solid ${scheme.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: scheme.borderLight }}>
          <h3 className="font-semibold" style={{ color: scheme.textPrimary }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5">
            <X className="w-5 h-5" style={{ color: scheme.textSecondary }} />
          </button>
        </div>
        
        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: scheme.primary }} />
            </div>
          ) : albums.length === 0 ? (
            <div className="text-center p-8" style={{ color: scheme.textSecondary }}>
              暂无其他相册
            </div>
          ) : (
            <div className="space-y-1">
              {albums.map(album => (
                <button
                  key={album.id}
                  onClick={() => onSelect(album.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-black/5"
                >
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${scheme.primary}15` }}>
                    <Folder className="w-5 h-5" style={{ color: scheme.primary }} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-sm" style={{ color: scheme.textPrimary }}>{album.name}</p>
                    <p className="text-xs mt-0.5 truncate max-w-[250px]" style={{ color: scheme.textSecondary }}>{album.path}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
