import { addDoc, collection, serverTimestamp, updateDoc, doc, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Create a notification in Firestore
 * @param {string} userId - User ID
 * @param {string} type - Notification type (workout, streak, roadmap, ai_coach)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
export const createNotification = async (userId, type, title, message) => {
  if (!userId) {
    console.log('[createNotification] No userId provided')
    return null
  }

  try {
    console.log('[createNotification] Creating notification:', { userId, type, title, message })
    const notificationsRef = collection(db, 'users', userId, 'notifications')
    const docRef = await addDoc(notificationsRef, {
      type,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
    })
    console.log('[createNotification] Created notification with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('[createNotification] Error:', error)
    return null
  }
}

/**
 * Fetch all notifications for a user, sorted by newest first
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of notifications with ids
 */
export const fetchNotifications = async (userId) => {
  if (!userId) return []

  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications')
    const q = query(notificationsRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

/**
 * Fetch unread notifications count
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
export const fetchUnreadCount = async (userId) => {
  if (!userId) return 0

  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications')
    const q = query(notificationsRef, where('read', '==', false))
    const snapshot = await getDocs(q)
    return snapshot.size
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }
}

/**
 * Mark a notification as read
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  if (!userId || !notificationId) {
    console.log('[markNotificationAsRead] Missing userId or notificationId')
    return
  }

  try {
    console.log('[markNotificationAsRead] Marking as read:', { userId, notificationId })
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId)
    await updateDoc(notificationRef, { read: true })
    console.log('[markNotificationAsRead] Successfully marked as read')
  } catch (error) {
    console.error('[markNotificationAsRead] Error:', error)
  }
}

/**
 * Mark all notifications as read
 * @param {string} userId - User ID
 * @param {Array<string>} notificationIds - Notification IDs to mark as read
 */
export const markAllNotificationsAsRead = async (userId, notificationIds) => {
  if (!userId || notificationIds.length === 0) {
    console.log('[markAllNotificationsAsRead] Missing userId or empty notificationIds')
    return
  }

  try {
    console.log('[markAllNotificationsAsRead] Marking all as read:', { userId, count: notificationIds.length })
    const promises = notificationIds.map(id =>
      updateDoc(doc(db, 'users', userId, 'notifications', id), { read: true })
    )
    await Promise.all(promises)
    console.log('[markAllNotificationsAsRead] Successfully marked all as read')
  } catch (error) {
    console.error('[markAllNotificationsAsRead] Error:', error)
  }
}

/**
 * Get notification preferences from localStorage
 */
export const getNotificationPreferences = () => {
  try {
    const prefs = localStorage.getItem('fitforge_notification_prefs')
    if (!prefs) {
      return {
        workoutAlerts: true,
        streakAlerts: true,
        aiCoachUpdates: true,
      }
    }
    return JSON.parse(prefs)
  } catch (error) {
    console.error('Error parsing notification preferences:', error)
    return {
      workoutAlerts: true,
      streakAlerts: true,
      aiCoachUpdates: true,
    }
  }
}

/**
 * Set notification preferences in localStorage
 * @param {Object} preferences - Notification preferences
 */
export const setNotificationPreferences = (preferences) => {
  try {
    localStorage.setItem('fitforge_notification_prefs', JSON.stringify(preferences))
  } catch (error) {
    console.error('Error saving notification preferences:', error)
  }
}
