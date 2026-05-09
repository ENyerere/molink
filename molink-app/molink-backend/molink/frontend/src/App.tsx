import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
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

  if (!user) {
    return <Navigate to="/login" />
  }

  if (!user.is_admin) {
    return <Navigate to="/workspace" />
  }

  return <>{children}</>
}

function App() {
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

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/workspace" /> : <LoginPage />} 
      />
      <Route 
        path="/register" 
        element={user ? <Navigate to="/workspace" /> : <RegisterPage />} 
      />
      <Route 
        path="/workspace/*" 
        element={user ? <WorkspacePage /> : <Navigate to="/login" />} 
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
        element={<Navigate to={user ? "/workspace" : "/login"} />} 
      />
    </Routes>
  )
}

export default App
