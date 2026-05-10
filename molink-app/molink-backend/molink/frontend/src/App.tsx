import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import WorkspacePage from './pages/WorkspacePage'
import AdminDashboard from './pages/Admin/AdminDashboard'

// 管理员路由保护组件
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-theme-base">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-accent mx-auto"></div>
          <p className="mt-4 text-text-muted">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user || !user.is_admin) {
    return <Navigate to="/workspace" />
  }

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route 
        path="/workspace/*" 
        element={<WorkspacePage />} 
      />
      <Route 
        path="/admin/*" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />
      <Route 
        path="*" 
        element={<Navigate to="/workspace" />} 
      />
    </Routes>
  )
}

export default App
