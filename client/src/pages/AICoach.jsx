import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import AIResponseCard from '../components/ui/AIResponseCard'
import { db } from '../firebase/config'
import useAuth from '../hooks/useAuth'
import { getAICoachAdvice } from '../utils/apiService'

const WEEK_DAYS = 7

const toDate = (value) => {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const normalizeWorkout = (workout) => ({
  ...workout,
  date: toDate(workout.date)?.toISOString() || null,
  createdAt: toDate(workout.createdAt)?.toISOString() || null,
})

const buildSummaryParagraph = (adviceText) => {
  if (!adviceText?.trim()) return 'Your coach is ready with personalized feedback as soon as your latest sessions sync.'
  const parts = adviceText
    .split('\n')
    .map((line) => line.replace(/^•\s*/, '').trim())
    .filter(Boolean)

  if (!parts.length) return adviceText.trim()
  return parts.join(' ')
}

const AICoach = () => {
  const { currentUser } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [advice, setAdvice] = useState('')
  const [loadingAdvice, setLoadingAdvice] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadCoachAdvice = useCallback(async () => {
    if (!currentUser?.uid) return

    setLoadingAdvice(true)
    setErrorMessage('')

    try {
      const workoutsRef = collection(db, `users/${currentUser.uid}/workouts`)
      const workoutQuery = query(workoutsRef, orderBy('date', 'desc'), limit(WEEK_DAYS))
      const snapshot = await getDocs(workoutQuery)
      const recentWorkouts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      setWorkouts(recentWorkouts)
      const adviceText = await getAICoachAdvice(recentWorkouts.map(normalizeWorkout), {
        userId: currentUser.uid,
      })
      setAdvice(adviceText)
    } catch (error) {
      console.error('Failed to load AI coach advice:', error)
      setErrorMessage('Could not load AI advice right now. Tap refresh to try again.')
      setAdvice('')
    } finally {
      setLoadingAdvice(false)
    }
  }, [currentUser?.uid])

  useEffect(() => {
    loadCoachAdvice()
  }, [loadCoachAdvice])

  const weeklySummary = useMemo(() => {
    const trainedDaySet = new Set()
    const muscleGroupSet = new Set()
    let totalCardioDistance = 0

    workouts.forEach((workout) => {
      const workoutDate = toDate(workout.date)
      if (workoutDate) {
        trainedDaySet.add(workoutDate.toISOString().slice(0, 10))
      }

      if (workout.type === 'weight_training') {
        ;(workout.muscleGroups || []).forEach((group) => muscleGroupSet.add(group))
      }

      if (workout.type === 'cardio') {
        totalCardioDistance += Number(workout.distance) || 0
      }
    })

    return {
      totalWorkouts: workouts.length,
      muscleGroups: Array.from(muscleGroupSet),
      restDays: Math.max(0, WEEK_DAYS - trainedDaySet.size),
      totalCardioDistance: totalCardioDistance.toFixed(2),
      summaryParagraph: buildSummaryParagraph(advice),
    }
  }, [advice, workouts])

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">AI Coach</p>
        <h1 className="mt-2 text-2xl font-bold">Your weekly training guidance</h1>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">Today&apos;s AI Tip</h2>
          <button
            type="button"
            onClick={loadCoachAdvice}
            disabled={loadingAdvice}
            className="h-10 rounded-xl border border-primary px-3 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAdvice ? 'Refreshing...' : 'Refresh Advice'}
          </button>
        </div>

        <AIResponseCard advice={advice} loading={loadingAdvice} />
        {errorMessage ? <p className="text-sm font-medium text-danger">{errorMessage}</p> : null}
      </section>

      <section className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <h2 className="text-lg font-bold">Weekly Summary</h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#E4E4E7] bg-white p-3 dark:border-dark-border dark:bg-dark-bg">
            <p className="text-2xl font-black">{weeklySummary.totalWorkouts}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Total workouts</p>
          </div>
          <div className="rounded-xl border border-[#E4E4E7] bg-white p-3 dark:border-dark-border dark:bg-dark-bg">
            <p className="text-2xl font-black">{weeklySummary.restDays}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Rest days</p>
          </div>
          <div className="col-span-2 rounded-xl border border-[#E4E4E7] bg-white p-3 dark:border-dark-border dark:bg-dark-bg">
            <p className="text-2xl font-black">{weeklySummary.totalCardioDistance} km</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">
              Total cardio distance
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Muscle groups trained</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {weeklySummary.muscleGroups.length ? (
              weeklySummary.muscleGroups.map((group) => (
                <span key={group} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                  {group}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#6B7280] dark:text-zinc-400">No weight-training muscle groups logged this week.</span>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#E4E4E7] bg-white p-3 dark:border-dark-border dark:bg-dark-bg">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">AI-generated weekly summary</p>
          <p className="mt-2 text-sm leading-relaxed text-[#111111] dark:text-zinc-100">{weeklySummary.summaryParagraph}</p>
        </div>
      </section>
    </section>
  )
}

export default AICoach
