import { useEffect, useRef } from 'react'

/**
 * NotificationDrawer Component
 * Displays real-time notifications from Firestore.
 * Updates instantly when notifications are created or marked as read via onSnapshot listener.
 */

const BellIcon = ({ unread = 0 }) => (
  <div className="relative">
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
      <path d="M12 2c-1.1 0-2 .9-2 2v2c0 1.1-.9 2-2 2H6v3c0 2.2-1.8 4-4 4h1c0 3.3 2.7 6 6 6s6-2.7 6-6h1c-2.2 0-4-1.8-4-4v-3h2c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2h-2zm0 18c-2.2 0-4-1.8-4-4h8c0 2.2-1.8 4-4 4z" />
    </svg>
    {unread > 0 && (
      <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
        {unread > 9 ? '9+' : unread}
      </span>
    )}
  </div>
)

const NotificationDrawer = ({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead }) => {
  console.log('[NotificationDrawer] 📍 Rendered with props:')
  console.log('[NotificationDrawer] notifications prop:', notifications)
  console.log('[NotificationDrawer] notifications length:', notifications.length)
  console.log('[NotificationDrawer] isOpen:', isOpen)
  
  const drawerRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Debug logging
  useEffect(() => {
    console.log('[NotificationDrawer] 📊 State snapshot:')
    console.log('[NotificationDrawer] - notifications array length:', notifications.length)
    console.log('[NotificationDrawer] - full array:', JSON.stringify(notifications, null, 2))
    if (notifications.length > 0) {
      console.log('[NotificationDrawer] - first item:', notifications[0])
    }
  }, [notifications])

  const unreadNotifications = notifications.filter(n => !n.read)

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'workout':
        return '💪'
      case 'streak':
        return '🔥'
      case 'roadmap':
        return '🗺️'
      case 'ai_coach':
        return '🤖'
      default:
        return '✨'
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''

    // Handle both Firestore Timestamp and regular Date objects
    let date
    if (typeof timestamp.toDate === 'function') {
      // Firestore Timestamp
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      // Regular Date
      date = timestamp
    } else if (typeof timestamp === 'number') {
      // Unix timestamp in milliseconds
      date = new Date(timestamp)
    } else if (timestamp.seconds) {
      // Firestore Timestamp object structure
      date = new Date(timestamp.seconds * 1000)
    } else {
      return ''
    }

    const now = new Date()
    const diff = now - date

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  useEffect(() => {
    console.log('[NotificationDrawer] 📊 Detailed state:')
    console.log('[NotificationDrawer] - notifications array:', JSON.stringify(notifications, null, 2))
    console.log('[NotificationDrawer] - unreadNotifications:', unreadNotifications.length)
    console.log('[NotificationDrawer] - is rendering empty state:', notifications.length === 0)
  }, [notifications, unreadNotifications])

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-sm transform rounded-l-3xl border-l border-[#E4E4E7] bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-dark-border dark:bg-dark-bg ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-[#E4E4E7] bg-white p-6 dark:border-dark-border dark:bg-dark-bg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Notifications</h2>
            <button
              onClick={onClose}
              className="p-1 text-2xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="Close notifications"
            >
              ×
            </button>
          </div>
          {unreadNotifications.length > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="mt-2 text-xs font-semibold text-primary hover:opacity-80"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Content */}
        <div className="h-[calc(100%-80px)] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div className="text-zinc-500 dark:text-zinc-400">
                <p className="text-2xl">✨</p>
                <p className="mt-2 text-sm font-medium">No notifications yet</p>
                <p className="mt-1 text-xs">You&apos;re all caught up!</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#E4E4E7] dark:divide-dark-border">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => !notification.read && onMarkAsRead(notification.id)}
                  className={`cursor-pointer border-l-4 px-6 py-4 transition-colors duration-200 ${
                    notification.read
                      ? 'border-l-transparent bg-white dark:bg-dark-bg'
                      : 'border-l-primary bg-orange-50/50 hover:bg-orange-100/30 dark:bg-orange-950/20 dark:hover:bg-orange-950/30'
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <h3 className={`text-sm font-semibold ${notification.read ? 'text-zinc-500 dark:text-zinc-400' : 'text-[#111111] dark:text-white'}`}>
                        {notification.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default NotificationDrawer
export { BellIcon }
