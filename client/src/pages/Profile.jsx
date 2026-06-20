import { useCallback, useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import useAuth from '../hooks/useAuth'
import useWorkouts from '../hooks/useWorkouts'
import { db } from '../firebase/config'
import { getNotificationPreferences, setNotificationPreferences } from '../utils/notificationService'

const Profile = () => {
  const { currentUser, logout } = useAuth()
  const { workouts } = useWorkouts()
  const [profile, setProfile] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('fitforge-theme') || 'dark')
  const [units, setUnits] = useState(() => localStorage.getItem('fitforge-units') || 'km')
  const [notificationPrefs, setNotificationPrefs] = useState(() => getNotificationPreferences())
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  const fallbackName = currentUser?.email?.split('@')[0] || 'Athlete'
  const displayName = currentUser?.displayName || fallbackName
  const email = currentUser?.email || ''
  const avatarUrl = currentUser?.photoURL
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const memberSince = currentUser?.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'Recently'

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.uid) return
      const profileRef = doc(db, 'users', currentUser.uid)
      const profileSnapshot = await getDoc(profileRef)
      setProfile(profileSnapshot.exists() ? profileSnapshot.data() : null)
    }
    loadProfile()
  }, [currentUser])

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('fitforge-theme') || 'dark')
    }
    window.addEventListener('storage', handleThemeChange)
    return () => window.removeEventListener('storage', handleThemeChange)
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('fitforge-theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }, [theme])

  const toggleUnits = useCallback(() => {
    const newUnits = units === 'km' ? 'miles' : 'km'
    setUnits(newUnits)
    localStorage.setItem('fitforge-units', newUnits)
  }, [units])

  const toggleNotificationPref = useCallback((pref) => {
    const updated = { ...notificationPrefs, [pref]: !notificationPrefs[pref] }
    setNotificationPrefs(updated)
    setNotificationPreferences(updated)
  }, [notificationPrefs])

  const handleSignOut = useCallback(async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }, [logout])

  const fitnessStats = useMemo(() => {
    const totalWorkouts = profile?.totalWorkouts || 0
    const longestStreak = profile?.longestStreak || 0

    // Approximate from recent workouts
    const muscleGroupCount = {}
    let totalCardioDistance = 0

    workouts.forEach(workout => {
      if (workout.type === 'weight_training' && workout.muscleGroups) {
        workout.muscleGroups.forEach(group => {
          muscleGroupCount[group] = (muscleGroupCount[group] || 0) + 1
        })
      } else if (workout.type === 'cardio') {
        totalCardioDistance += Number(workout.distance || 0)
      }
    })

    const mostTrainedMuscle = Object.keys(muscleGroupCount).length
      ? Object.entries(muscleGroupCount).sort(([,a], [,b]) => b - a)[0][0]
      : 'None yet'

    const convertedDistance = units === 'miles' ? totalCardioDistance * 0.621371 : totalCardioDistance

    return {
      totalWorkouts,
      longestStreak,
      mostTrainedMuscle,
      totalCardioDistance: Number(convertedDistance.toFixed(1)),
    }
  }, [profile, workouts, units])

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Profile</p>
        <h1 className="mt-2 text-2xl font-bold">Your fitness journey</h1>
      </header>

      <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-6 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-16 w-16 rounded-full border-2 border-[#E4E4E7] dark:border-dark-border"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F97316] text-xl font-bold text-white">
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold truncate">{displayName}</h2>
            <p className="text-sm text-[#6B7280] dark:text-zinc-400 truncate">{email}</p>
            <p className="text-xs text-[#6B7280] dark:text-zinc-400 mt-1">Member since {memberSince}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">Fitness Stats</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
            <p className="text-2xl font-black text-[#111111] dark:text-white">{fitnessStats.totalWorkouts}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">Total workouts</p>
          </div>
          <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
            <p className="text-2xl font-black text-[#111111] dark:text-white">{fitnessStats.longestStreak}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">Longest streak</p>
          </div>
          <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
            <p className="text-2xl font-black text-[#111111] dark:text-white">{fitnessStats.mostTrainedMuscle}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">Most trained muscle</p>
          </div>
          <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
            <p className="text-2xl font-black text-[#111111] dark:text-white">{fitnessStats.totalCardioDistance} {units}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">Cardio distance</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
            <div>
              <p className="font-semibold">Theme</p>
              <p className="text-sm text-[#6B7280] dark:text-zinc-400">Dark or light mode</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316] text-white transition hover:bg-[#EA580C]"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
          <div className="flex items-center justify-between rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
            <div>
              <p className="font-semibold">Units</p>
              <p className="text-sm text-[#6B7280] dark:text-zinc-400">Distance measurement</p>
            </div>
            <button
              onClick={toggleUnits}
              className="rounded-full bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
            >
              {units}
            </button>
          </div>
          <div className="space-y-3 rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
            <div>
              <p className="font-semibold">Notifications</p>
              <p className="text-sm text-[#6B7280] dark:text-zinc-400">Customize your alerts</p>
            </div>
            <div className="space-y-3 border-t border-[#E4E4E7] pt-3 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Workout Alerts</p>
                  <p className="text-xs text-[#6B7280] dark:text-zinc-400">When you log a workout</p>
                </div>
                <button
                  onClick={() => toggleNotificationPref('workoutAlerts')}
                  className={`relative h-6 w-11 rounded-full transition ${
                    notificationPrefs.workoutAlerts ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                  role="switch"
                  aria-checked={notificationPrefs.workoutAlerts}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                      notificationPrefs.workoutAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Streak Alerts</p>
                  <p className="text-xs text-[#6B7280] dark:text-zinc-400">Milestone achievements</p>
                </div>
                <button
                  onClick={() => toggleNotificationPref('streakAlerts')}
                  className={`relative h-6 w-11 rounded-full transition ${
                    notificationPrefs.streakAlerts ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                  role="switch"
                  aria-checked={notificationPrefs.streakAlerts}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                      notificationPrefs.streakAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">AI Coach Updates</p>
                  <p className="text-xs text-[#6B7280] dark:text-zinc-400">Roadmaps and coaching tips</p>
                </div>
                <button
                  onClick={() => toggleNotificationPref('aiCoachUpdates')}
                  className={`relative h-6 w-11 rounded-full transition ${
                    notificationPrefs.aiCoachUpdates ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                  role="switch"
                  aria-checked={notificationPrefs.aiCoachUpdates}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                      notificationPrefs.aiCoachUpdates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">Account</h2>
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 text-left font-semibold text-[#111111] transition hover:bg-[#E5E7EB] dark:border-dark-border dark:bg-dark-card dark:text-zinc-200 dark:hover:bg-dark-bg"
        >
          Sign Out
        </button>
      </div>

      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-6 text-center transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
            <h3 className="text-lg font-bold">Sign Out</h3>
            <p className="mt-2 text-sm text-[#6B7280] dark:text-zinc-400">Are you sure you want to sign out?</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 rounded-full border border-[#E4E4E7] py-3 text-sm font-semibold transition hover:bg-[#E5E7EB] dark:border-dark-border dark:hover:bg-dark-bg"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 rounded-full bg-[#F97316] py-3 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Profile
