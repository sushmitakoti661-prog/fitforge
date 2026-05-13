import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import useAuth from '../hooks/useAuth'
import useWorkouts from '../hooks/useWorkouts'
import StreakBadge from '../components/ui/StreakBadge'
import { db } from '../firebase/config'

const Dashboard = () => {
  const { currentUser } = useAuth()
  const { workouts } = useWorkouts()
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const fallbackName = currentUser?.email?.split('@')[0] || 'Athlete'
  const firstName = (currentUser?.displayName || fallbackName).split(' ')[0]
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.uid) {
        setProfile(null)
        setLoadingProfile(false)
        return
      }

      const profileRef = doc(db, 'users', currentUser.uid)
      const profileSnapshot = await getDoc(profileRef)
      setProfile(profileSnapshot.exists() ? profileSnapshot.data() : null)
      setLoadingProfile(false)
    }

    loadProfile()
  }, [currentUser])

  const currentStreak = profile?.currentStreak || 0
  const longestStreak = profile?.longestStreak || 0
  const streakLabel = currentStreak === 1 ? 'day' : 'days'
  const longestStreakLabel = longestStreak === 1 ? 'day' : 'days'
  const lastWorkoutDate = profile?.lastWorkoutDate
  const lastWorkoutText = lastWorkoutDate
    ? typeof lastWorkoutDate.toDate === 'function'
      ? lastWorkoutDate.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : new Date(lastWorkoutDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'No workouts logged yet'
  const streakMessage = currentStreak === 0
    ? 'Log a workout today to start your streak.'
    : currentStreak >= 30
    ? "Your dedication is paying off — keep the momentum going."
    : currentStreak >= 7
    ? 'Keep it rolling, consistency is your superpower.'
    : "You're building momentum — keep it going."

  // Calculate this week's workouts
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay()) // Monday
  startOfWeek.setHours(0, 0, 0, 0)
  const thisWeekWorkouts = workouts.filter((workout) => {
    const workoutDate = typeof workout.date.toDate === 'function' ? workout.date.toDate() : new Date(workout.date)
    return workoutDate >= startOfWeek
  }).length

  // Last workout details
  const lastWorkout = workouts[0] // Since workouts are sorted desc
  const lastWorkoutName = lastWorkout?.workoutName || lastWorkout?.activityType || 'Workout'
  const lastWorkoutRelative = lastWorkout ? (() => {
    const workoutDate = typeof lastWorkout.date.toDate === 'function' ? lastWorkout.date.toDate() : new Date(lastWorkout.date)
    const diffTime = now - workoutDate
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  })() : 'None'

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Dashboard</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight">Welcome back, {firstName}!</h1>
        <p className="mt-1 text-sm text-[#6B7280] dark:text-zinc-400">{today}</p>
      </div>

      <div className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Streak</p>
            <p className="mt-2 text-3xl font-extrabold">{currentStreak} {streakLabel}</p>
            <p className="mt-2 text-sm text-[#6B7280] dark:text-zinc-400">{streakMessage}</p>
          </div>
          <div className="mt-4 lg:mt-0">
            <StreakBadge streak={currentStreak} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-[#6B7280] dark:text-zinc-400">
          <span className="rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/5">Best streak: {longestStreak} {longestStreakLabel}</span>
          <span className="rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/5">Last workout: {lastWorkoutText}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Recent Workouts</p>
        <p className="mt-2 text-2xl font-bold">{thisWeekWorkouts} workouts this week</p>
        <p className="mt-2 text-sm text-[#6B7280] dark:text-zinc-400">
          Last workout: {lastWorkoutName} • {lastWorkoutRelative}
        </p>
      </div>

      <div className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">AI Tip</p>
        <p className="mt-2 text-sm leading-relaxed text-[#374151] dark:text-zinc-200">
          Keep your sessions consistent this week. Even 20 focused minutes today can build momentum for your first streak.
        </p>
      </div>
    </section>
  )
}

export default Dashboard
