import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

const Layout = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('fitforge-theme') || 'dark')

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('fitforge-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#111111] transition-colors duration-300 dark:bg-dark-bg dark:text-white">
      <TopBar theme={theme} onToggleTheme={toggleTheme} />
      <main className="mx-auto w-full max-w-3xl px-4 py-4 pb-28">
        <Outlet />
      </main>
      <BottomNav theme={theme} />
    </div>
  )
}

export default Layout
