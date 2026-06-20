import { useEffect, useState } from 'react'
import logoDark from '../../assets/logo-dark.svg'
import logoLight from '../../assets/logo-light.svg'
import NotificationDrawer, { BellIcon } from '../ui/NotificationDrawer'
import useNotifications from '../../hooks/useNotifications'
import useAuth from '../../hooks/useAuth'

const SunIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M12 2.5v2.3M12 19.2v2.3M21.5 12h-2.3M4.8 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M20 14.3A8.3 8.3 0 1110.7 4a6.8 6.8 0 009.3 10.3z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const TopBar = ({ theme, onToggleTheme }) => {
  const { currentUser } = useAuth()
  console.log('[TopBar] currentUser:', currentUser?.uid)
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications(currentUser?.uid)
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('[TopBar] ===== FULL STATE TRACE =====')
    console.log('[TopBar] currentUser.uid:', currentUser?.uid)
    console.log('[TopBar] Notifications received from hook:', notifications)
    console.log('[TopBar] Notifications count:', notifications.length)
    console.log('[TopBar] Unread count:', unreadCount)
    console.log('[TopBar] Loading:', loading)
    console.log('[TopBar] Drawer open:', isNotificationDrawerOpen)
  }, [currentUser, notifications, unreadCount, loading, isNotificationDrawerOpen])

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-[#E4E4E7] bg-[#F9F9F9]/95 px-4 py-3 backdrop-blur transition-colors duration-300 dark:border-dark-border dark:bg-dark-bg/95">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <div className="flex h-12 max-w-[190px] items-center">
            <img src={logoLight} alt="FitForge" className="h-12 w-auto max-w-[190px] object-contain dark:hidden" />
            <img src={logoDark} alt="FitForge" className="hidden h-12 w-auto max-w-[190px] object-contain dark:block" />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E4E7] bg-white text-[#111111] transition hover:border-primary hover:text-primary dark:border-dark-border dark:bg-dark-card dark:text-zinc-100"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              onClick={() => setIsNotificationDrawerOpen(!isNotificationDrawerOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E4E7] bg-white text-[#111111] transition hover:border-primary hover:text-primary dark:border-dark-border dark:bg-dark-card dark:text-zinc-100"
              aria-label="Notifications"
            >
              <BellIcon unread={unreadCount} />
            </button>
          </div>
        </div>
      </header>

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </>
  )
}

export default TopBar
