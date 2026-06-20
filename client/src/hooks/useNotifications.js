import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../utils/notificationService'

/**
 * Convert Firestore Timestamp to Date
 * @param {*} timestamp - Firestore Timestamp or Date
 * @returns {Date} JavaScript Date object
 */
const convertTimestamp = (timestamp) => {
  if (!timestamp) return new Date()
  if (timestamp instanceof Date) return timestamp
  if (typeof timestamp.toDate === 'function') return timestamp.toDate()
  return new Date(timestamp)
}

export default function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Real-time listener for all notifications
  useEffect(() => {
    console.log('[useNotifications] useEffect triggered with userId:', userId)
    
    if (!userId) {
      console.log('[useNotifications] ⚠️ No userId provided - skipping setup')
      setLoading(false)
      setNotifications([])
      setUnreadCount(0)
      return
    }

    console.log('[useNotifications] ✅ Setting up onSnapshot listener for userId:', userId)
    setLoading(true)

    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications')
      console.log('[useNotifications] Query path:', `users/${userId}/notifications`)
      const q = query(notificationsRef, orderBy('createdAt', 'desc'))

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('[useNotifications] 🔔 onSnapshot fired!')
        console.log('[useNotifications] Snapshot doc count:', snapshot.size)
        console.log('[useNotifications] Snapshot empty:', snapshot.empty)

        const notificationsList = snapshot.docs.map(doc => {
          const data = doc.data()
          const mapped = {
            id: doc.id,
            type: data.type || 'notification',
            title: data.title || 'Notification',
            message: data.message || '',
            read: data.read || false,
            createdAt: data.createdAt,
            createdAtDate: convertTimestamp(data.createdAt),
          }
          console.log('[useNotifications] Mapped doc:', mapped)
          return mapped
        })

        console.log('[useNotifications] ✅ MAPPED NOTIFICATIONS ARRAY:', notificationsList)
        console.log('[useNotifications] Array length:', notificationsList.length)
        setNotifications(notificationsList)

        // Count unread
        const unread = notificationsList.filter(n => !n.read).length
        console.log('[useNotifications] Unread count calculated:', unread)
        setUnreadCount(unread)
        setLoading(false)
        console.log('[useNotifications] State updated - notifications:', notificationsList.length, '- unread:', unread)
      }, (error) => {
        console.error('[useNotifications] ❌ Listener error:', error)
        setLoading(false)
      })

      console.log('[useNotifications] 🎯 Listener subscribed successfully')

      return () => {
        console.log('[useNotifications] 🛑 Unsubscribing listener for userId:', userId)
        unsubscribe()
      }
    } catch (error) {
      console.error('[useNotifications] ❌ Setup error:', error)
      setLoading(false)
    }
  }, [userId])

  console.log('[useNotifications] Returning state - notifications:', notifications.length, 'unreadCount:', unreadCount, 'loading:', loading)

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    if (!userId) return

    await markNotificationAsRead(userId, notificationId)
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  // Mark all as read
  const markAllAsRead = async () => {
    if (!userId) return

    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return

    await markAllNotificationsAsRead(userId, unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  // Add a notification to the local state
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev])
    if (!notification.read) {
      setUnreadCount(prev => prev + 1)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    addNotification,
  }
}
