import { useEffect, useState } from 'react'
import {
  Puzzle,
  Download,
  Trash2,
  Power,
  PowerOff,
  Settings,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Package,
  Search
} from 'lucide-react'
import { usePluginStore, PluginInfo } from '../../stores/usePluginStore'
import { formatDate } from '../../utils/format'

export default function PluginsPage() {
  const {
    plugins,
    isLoading,
    error,
    loadPlugins,
    installNewPlugin,
    uninstallExistingPlugin,
    togglePluginStatus,
    clearError
  } = usePluginStore()

  const [manifestPath, setManifestPath] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null)
  const [showInstallDialog, setShowInstallDialog] = useState(false)

  useEffect(() => {
    loadPlugins()
  }, [loadPlugins])

  const handleInstall = async () => {
    if (!manifestPath.trim()) {
      return
    }

    const success = await installNewPlugin(manifestPath.trim())
    if (success) {
      setManifestPath('')
      setShowInstallDialog(false)
    }
  }

  const handleUninstall = async (uuid: string) => {
    if (window.confirm('确定要卸载此插件吗？')) {
      await uninstallExistingPlugin(uuid)
      if (selectedPlugin?.uuid === uuid) {
        setSelectedPlugin(null)
      }
    }
  }

  const handleToggle = async (uuid: string, enabled: boolean) => {
    await togglePluginStatus(uuid, enabled)
  }

  const filteredPlugins = plugins.filter(plugin =>
    plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plugin.author?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const enabledCount = plugins.filter(p => p.enabled).length
  const disabledCount = plugins.filter(p => !p.enabled).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 头部 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">插件管理</h1>
        <p className="text-gray-600 mt-1">安装和管理扩展插件</p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总插件数</p>
              <p className="text-2xl font-bold text-gray-900">{plugins.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已启用</p>
              <p className="text-2xl font-bold text-green-600">{enabledCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              <PowerOff className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已禁用</p>
              <p className="text-2xl font-bold text-gray-500">{disabledCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索插件..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={loadPlugins}
              disabled={isLoading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <button
            onClick={() => setShowInstallDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            安装插件
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 安装对话框 */}
      {showInstallDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">安装插件</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  插件清单路径
                </label>
                <input
                  type="text"
                  value={manifestPath}
                  onChange={(e) => setManifestPath(e.target.value)}
                  placeholder="输入 plugin.json 文件的完整路径"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  请选择插件目录中的 plugin.json 文件
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowInstallDialog(false)
                    setManifestPath('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleInstall}
                  disabled={!manifestPath.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  安装
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 插件列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">加载中...</span>
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Puzzle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-900">
            {searchQuery ? '未找到匹配的插件' : '暂无已安装的插件'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {searchQuery ? '请尝试其他搜索词' : '点击"安装插件"按钮添加新插件'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlugins.map((plugin) => (
            <div
              key={plugin.uuid}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                plugin.enabled
                  ? 'border-gray-200'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      plugin.enabled ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Puzzle className={`w-5 h-5 ${
                        plugin.enabled ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{plugin.name}</h3>
                      <p className="text-xs text-gray-500">v{plugin.version}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(plugin.uuid, !plugin.enabled)}
                    className={`p-1 rounded-lg transition-colors ${
                      plugin.enabled
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={plugin.enabled ? '禁用插件' : '启用插件'}
                  >
                    {plugin.enabled ? (
                      <Power className="w-5 h-5" />
                    ) : (
                      <PowerOff className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {plugin.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  {plugin.author && (
                    <span>作者: {plugin.author}</span>
                  )}
                  <span>安装: {formatDate(plugin.installedAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {plugin.web && (
                    <a
                      href={plugin.web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-3 h-3" />
                      官网
                    </a>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => setSelectedPlugin(plugin)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="设置"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleUninstall(plugin.uuid)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="卸载"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 插件详情对话框 */}
      {selectedPlugin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{selectedPlugin.name}</h2>
              <button
                onClick={() => setSelectedPlugin(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">UUID</p>
                <p className="font-mono text-sm">{selectedPlugin.uuid}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">描述</p>
                <p className="text-sm">{selectedPlugin.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">版本</p>
                  <p className="text-sm">{selectedPlugin.version}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">作者</p>
                  <p className="text-sm">{selectedPlugin.author || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">状态</p>
                  <p className="text-sm">
                    {selectedPlugin.enabled ? (
                      <span className="text-green-600">已启用</span>
                    ) : (
                      <span className="text-gray-500">已禁用</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">安装时间</p>
                  <p className="text-sm">{formatDate(selectedPlugin.installedAt)}</p>
                </div>
              </div>

              {selectedPlugin.config && Object.keys(selectedPlugin.config).length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">配置</p>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedPlugin.config, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedPlugin(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
