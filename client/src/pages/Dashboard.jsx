import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import useAuth from '../hooks/useAuth'
import useWorkouts from '../hooks/useWorkouts'
import WorkoutCard from '../components/ui/WorkoutCard'
import StreakBadge from '../components/ui/StreakBadge'
import { db } from '../firebase/config'

const getTimeGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const formatRelativeDate = (value) => {
  if (!value) return 'No activity yet'
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  const diff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

const formatRoadmapSubtitle = (roadmap) => {
  if (!roadmap) return 'Build a roadmap to stay focused on your next goal.'
  const goal = roadmap.goal || roadmap.modeLabel || 'Goal roadmap'
  return goal.length > 48 ? `${goal.slice(0, 45)}…` : goal
}

const Dashboard = () => {
  const { currentUser } = useAuth()
  const { workouts } = useWorkouts()
  const [profile, setProfile] = useState(null)
  const [dashboardStats, setDashboardStats] = useState({
    totalWorkouts: 0,
    weekWorkouts: 0,
    weekDistance: 0,
    latestRoadmap: null,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  const fallbackName = currentUser?.email?.split('@')[0] || 'Athlete'
  const firstName = (currentUser?.displayName || fallbackName).split(' ')[0]
  const greeting = getTimeGreeting()
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.uid) {
        setProfile(null)
        return
      }

      const profileRef = doc(db, 'users', currentUser.uid)
      const profileSnapshot = await getDoc(profileRef)
      setProfile(profileSnapshot.exists() ? profileSnapshot.data() : null)
    }

    loadProfile()
  }, [currentUser])

  useEffect(() => {
    const loadDashboardStats = async () => {
      if (!currentUser?.uid) {
        setDashboardStats({
          totalWorkouts: 0,
          weekWorkouts: 0,
          weekDistance: 0,
          latestRoadmap: null,
        })
        setLoadingStats(false)
        return
      }

      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      try {
        const workoutsRef = collection(db, `users/${currentUser.uid}/workouts`)
        const roadmapRef = collection(db, `users/${currentUser.uid}/roadmaps`)

        const [weekSnapshot, totalSnapshot, roadmapSnapshot] = await Promise.all([
          getDocs(query(workoutsRef, where('date', '>=', startOfWeek))),
          getDocs(workoutsRef),
          getDocs(query(roadmapRef, orderBy('generatedAt', 'desc'), limit(1))),
        ])

        const weekWorkouts = weekSnapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        const latestRoadmapDoc = roadmapSnapshot.docs[0]
        const latestRoadmap = latestRoadmapDoc ? { id: latestRoadmapDoc.id, ...latestRoadmapDoc.data() } : null

        const weekDistance = weekWorkouts.reduce((sum, workout) => {
          return workout.type === 'cardio' ? sum + Number(workout.distance || 0) : sum
        }, 0)

        setDashboardStats({
          totalWorkouts: totalSnapshot.size,
          weekWorkouts: weekWorkouts.length,
          weekDistance: Number(weekDistance.toFixed(1)),
          latestRoadmap,
        })
      } catch (error) {
        console.error('Failed to load dashboard stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    loadDashboardStats()
  }, [currentUser])

  const currentStreak = profile?.currentStreak || 0
  const streakLabel = currentStreak === 1 ? 'day' : 'days'
  const streakMessage = currentStreak === 0
    ? 'Start your streak today!'
    : currentStreak >= 30
    ? 'Your streak is on fire — keep it burning.'
    : 'Keep pushing, one workout at a time.'

  const recentWorkouts = useMemo(() => workouts.slice(0, 3), [workouts])
  const lastWorkoutDate = recentWorkouts[0]?.date
  const lastWorkoutRelative = formatRelativeDate(lastWorkoutDate)
  const latestRoadmap = dashboardStats.latestRoadmap

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Dashboard</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight">{greeting}, {firstName}.</h1>
        <p className="mt-1 text-sm text-[#6B7280] dark:text-zinc-400">{today}</p>
      </div>

      <div className="rounded-3xl border border-[#F59E0B]/20 bg-gradient-to-r from-[#FDE68A]/60 via-[#FBBF24]/30 to-[#F97316]/10 p-px shadow-lg dark:from-[#78350F]/50 dark:via-[#92400E]/40 dark:to-[#F97316]/10">
        <div className="rounded-3xl bg-[#F8FAFC] p-5 dark:bg-[#121212]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#92400E] dark:text-orange-200">Current Streak</p>
              <div className="mt-3 flex items-end gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F97316] text-4xl text-white shadow-lg">🔥</div>
                <div>
                  <p className="text-5xl font-black text-[#92400E] dark:text-orange-100">{currentStreak}</p>
                  <p className="text-sm uppercase tracking-[0.16em] text-[#92400E]/80 dark:text-orange-200">{streakLabel}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-[#F59E0B]/30 bg-white/90 p-4 text-sm text-[#78350F] shadow-sm dark:border-orange-500/20 dark:bg-[#2B1505] dark:text-orange-100">
              <p className="font-semibold">{streakMessage}</p>
              <p className="mt-2 text-xs text-[#92400E]/80 dark:text-orange-200">Keep your momentum alive with small daily wins.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 text-sm shadow-sm transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
          <p className="text-3xl font-black text-[#111111] dark:text-white">{loadingStats ? '—' : dashboardStats.weekWorkouts}</p>
          <p className="mt-2 uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">This week's workouts</p>
        </div>
        <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 text-sm shadow-sm transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
          <p className="text-3xl font-black text-[#111111] dark:text-white">{loadingStats ? '—' : dashboardStats.totalWorkouts}</p>
          <p className="mt-2 uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">Total workouts</p>
        </div>
        <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 text-sm shadow-sm transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
          <p className="text-3xl font-black text-[#111111] dark:text-white">{loadingStats ? '—' : dashboardStats.weekDistance} km</p>
          <p className="mt-2 uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">This week's distance</p>
        </div>
        <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 text-sm shadow-sm transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
          <p className="text-3xl font-black text-[#111111] dark:text-white">{currentStreak}</p>
          <p className="mt-2 uppercase tracking-[0.18em] text-[#6B7280] dark:text-zinc-400">Current streak</p>
        </div>
      </div>

      <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">AI Coach</p>
            <h2 className="mt-2 text-xl font-bold">Get smarter guidance for your training</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#374151] dark:text-zinc-300">A short workout tip from your AI Coach helps you stay focused and recover better.</p>
          </div>
          <Link
            to="/coach"
            className="inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
          >
            See full analysis →
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Recent Activity</p>
            <h2 className="mt-2 text-xl font-bold">Latest workouts</h2>
          </div>
          <Link
            to="/log"
            className="text-sm font-semibold text-primary transition hover:text-primary/80"
          >
            View last 7 workouts →
          </Link>
        </div>

        <div className="grid gap-3">
          {recentWorkouts.length ? (
            recentWorkouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))
          ) : (
            <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-5 text-sm text-[#6B7280] dark:border-dark-border dark:bg-dark-card dark:text-zinc-400">
              No recent workouts yet. Log your first session to start your activity feed.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-5 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Active Goal</p>
            <h2 className="mt-2 text-xl font-bold">{latestRoadmap ? formatRoadmapSubtitle(latestRoadmap) : 'No active roadmap yet'}</h2>
            <p className="mt-2 text-sm text-[#374151] dark:text-zinc-300">
              {latestRoadmap
                ? `Saved ${latestRoadmap.generatedAt ? new Date(latestRoadmap.generatedAt.toDate ? latestRoadmap.generatedAt.toDate() : latestRoadmap.generatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  }) : 'recently'}`
                : 'Create a roadmap to keep your goals on track.'}
            </p>
          </div>
          <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-sm dark:bg-[#111827]">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#F97316]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#C2410C]">
                {latestRoadmap ? 'Roadmap ready' : 'No goal yet'}
              </span>
              <span className="text-sm font-semibold text-[#6B7280] dark:text-zinc-400">Progress</span>
            </div>
            <div className="mt-4 h-2.5 rounded-full bg-[#E5E7EB] dark:bg-[#27272A]">
              <div className="h-2.5 w-3/5 rounded-full bg-[#F97316]" />
            </div>
            <p className="mt-3 text-sm text-[#4B5563] dark:text-zinc-400">
              {latestRoadmap ? 'Your latest goal roadmap is ready to review.' : 'Save a roadmap and it will appear here.'}
            </p>
            <Link
              to="/roadmap"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
            >
              View roadmap →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Dashboard
