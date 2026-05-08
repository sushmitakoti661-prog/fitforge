import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

const Layout = () => {
  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <TopBar />
      <main className="mx-auto w-full max-w-3xl px-4 py-4 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default Layout
