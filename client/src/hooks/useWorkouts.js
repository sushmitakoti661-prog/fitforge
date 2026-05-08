import { useCallback, useEffect, useState } from 'react'
import { collection, getDocs, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import useAuth from './useAuth'

const useWorkouts = () => {
  const { currentUser } = useAuth()
  const userId = currentUser?.uid || null
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(Boolean(userId))

  const refreshWorkouts = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      const workoutsRef = collection(db, `users/${userId}/workouts`)
      const workoutQuery = query(workoutsRef, orderBy('date', 'desc'), limit(7))
      const snapshot = await getDocs(workoutQuery)
      const nextWorkouts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setWorkouts(nextWorkouts)
    } catch (error) {
      console.error('Failed to fetch workouts:', error)
      setWorkouts([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return undefined

    const workoutsRef = collection(db, `users/${userId}/workouts`)
    const workoutQuery = query(workoutsRef, orderBy('date', 'desc'), limit(7))

    const unsubscribe = onSnapshot(
      workoutQuery,
      (snapshot) => {
        const nextWorkouts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setWorkouts(nextWorkouts)
        setLoading(false)
      },
      (error) => {
        console.error('Failed to subscribe workouts:', error)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [userId])

  return {
    workouts: userId ? workouts : [],
    loading: userId ? loading : false,
    refreshWorkouts,
  }
}

export default useWorkouts
