import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore, useUIStore } from './store'
import { applyTheme } from './lib/themes'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
// Timetable page removed — timetable shown on Dashboard
import Leaderboard from './pages/Leaderboard'
import Syllabus from './pages/Syllabus'
import ProfilePage from './pages/Profile'
import Routine from './pages/Routine'
import Challenges from './pages/Challenges'
import Analytics from './pages/Analytics'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />
}

function App() {
  const { accentColor } = useUIStore()

  useEffect(() => {
    applyTheme(accentColor)
  }, [accentColor])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/timetable" element={<Navigate to="/dashboard" replace />} />
          <Route path="/tasks" element={<Navigate to="/syllabus" replace />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/syllabus" element={<Syllabus />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
