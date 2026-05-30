import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import ErrorBoundary from './components/common/ErrorBoundary'
import Layout from './components/common/Layout'
import HomePage from './pages/Home'
import GalleryPage from './pages/Gallery'
import ShareCodesPage from './pages/ShareCodes'
import AIProcessPage from './pages/AIProcess'
import SettingsPage from './pages/Settings'
import DebugPage from './pages/Debug'
import TrashPage from './pages/Trash'
import MapPage from './pages/Map'
import TransferPage from './pages/Transfer'
import ReceivePage from './pages/Receive'
import AccountsPage from './pages/Accounts'
import DedupPage from './pages/Dedup'
import ResourcesPage from './pages/Resources'
import GifConverterPage from './pages/GifConverter'
import PluginsPage from './pages/Plugins'
import ArchivesPage from './pages/Archives'

function AppContent() {
  const { scheme } = useTheme()
  
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: scheme.bgCard,
            color: scheme.textPrimary,
            border: `1px solid ${scheme.border}`,
            borderRadius: '12px',
            boxShadow: scheme.shadowMd,
          },
          success: {
            iconTheme: {
              primary: scheme.success,
              secondary: scheme.textInverse,
            },
          },
          error: {
            iconTheme: {
              primary: scheme.error,
              secondary: scheme.textInverse,
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <ErrorBoundary>
              <HomePage />
            </ErrorBoundary>
          } />
          <Route path="gallery" element={
            <ErrorBoundary>
              <GalleryPage />
            </ErrorBoundary>
          } />
          <Route path="gallery/:albumId" element={
            <ErrorBoundary>
              <GalleryPage />
            </ErrorBoundary>
          } />
          <Route path="share-codes" element={
            <ErrorBoundary>
              <ShareCodesPage />
            </ErrorBoundary>
          } />
          <Route path="ai-process" element={
            <ErrorBoundary>
              <AIProcessPage />
            </ErrorBoundary>
          } />
          <Route path="settings" element={
            <ErrorBoundary>
              <SettingsPage />
            </ErrorBoundary>
          } />
          <Route path="debug" element={
            <ErrorBoundary>
              <DebugPage />
            </ErrorBoundary>
          } />
          <Route path="trash" element={
            <ErrorBoundary>
              <TrashPage />
            </ErrorBoundary>
          } />
          <Route path="map" element={
            <ErrorBoundary>
              <MapPage />
            </ErrorBoundary>
          } />
          <Route path="transfer" element={
            <ErrorBoundary>
              <TransferPage />
            </ErrorBoundary>
          } />
          <Route path="receive/:taskId" element={
            <ErrorBoundary>
              <ReceivePage />
            </ErrorBoundary>
          } />
          <Route path="accounts" element={
            <ErrorBoundary>
              <AccountsPage />
            </ErrorBoundary>
          } />
          <Route path="dedup" element={
            <ErrorBoundary>
              <DedupPage />
            </ErrorBoundary>
          } />
          <Route path="resources" element={
            <ErrorBoundary>
              <ResourcesPage />
            </ErrorBoundary>
          } />
          <Route path="gif-converter" element={
            <ErrorBoundary>
              <GifConverterPage />
            </ErrorBoundary>
          } />
          <Route path="plugins" element={
            <ErrorBoundary>
              <PluginsPage />
            </ErrorBoundary>
          } />
          <Route path="archives" element={
            <ErrorBoundary>
              <ArchivesPage />
            </ErrorBoundary>
          } />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
