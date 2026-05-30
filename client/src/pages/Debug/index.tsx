import { useState, useEffect } from 'react'
import axios from 'axios'

export default function DebugPage() {
  const [albums, setAlbums] = useState<any>(null)
  const [images, setImages] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testAPI = async () => {
      try {
        // 测试相册 API
        const albumsRes = await axios.get('/api/albums')
        console.log('Albums API response:', albumsRes.data)
        setAlbums(albumsRes.data)

        // 测试图片 API
        const imagesRes = await axios.get('/api/images?page=1&pageSize=10&sortBy=createdAt&sortOrder=desc')
        console.log('Images API response:', imagesRes.data)
        setImages(imagesRes.data)
      } catch (err) {
        console.error('API Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    testAPI()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API 调试页面</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>错误：</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">相册 API</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-48">
            {albums ? JSON.stringify(albums, null, 2) : '加载中...'}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">图片 API</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-48">
            {images ? JSON.stringify(images, null, 2) : '加载中...'}
          </pre>
        </div>
      </div>
    </div>
  )
}
