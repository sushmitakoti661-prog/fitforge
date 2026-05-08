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

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/log" element={<WorkoutLogger />} />
        <Route path="/coach" element={<AICoach />} />
        <Route path="/roadmap" element={<GoalRoadmap />} />
        <Route path="/chat" element={<Chatbot />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App
