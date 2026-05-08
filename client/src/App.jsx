import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Dashboard from './pages/Dashboard'
import WorkoutLogger from './pages/WorkoutLogger'
import AICoach from './pages/AICoach'
import GoalRoadmap from './pages/GoalRoadmap'
import Chatbot from './pages/Chatbot'
import Profile from './pages/Profile'
import useAuth from './hooks/useAuth'
import logoIcon from './assets/logo-icon.svg'

const FullScreenLoader = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-dark-bg text-sm text-zinc-300">
    <img src={logoIcon} alt="FitForge loading" className="h-8 w-8" />
    <p>Loading...</p>
  </div>
)

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!currentUser) return <Navigate to="/login" replace />
  return children
}

const AuthOnlyRoute = ({ children }) => {
  const { currentUser, loading } = useAuth()

  if (loading) return <FullScreenLoader />
  if (currentUser) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={
          <AuthOnlyRoute>
            <Login />
          </AuthOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthOnlyRoute>
            <Signup />
          </AuthOnlyRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/log" element={<WorkoutLogger />} />
        <Route path="/coach" element={<AICoach />} />
        <Route path="/roadmap" element={<GoalRoadmap />} />
        <Route path="/chat" element={<Chatbot />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
