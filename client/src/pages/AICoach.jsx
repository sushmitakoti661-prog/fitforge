import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, orderBy, query, doc, getDoc, setDoc, serverTimestamp, where, Timestamp, deleteDoc } from 'firebase/firestore'
import AIResponseCard, { AIResponseMarkdown } from '../components/ui/AIResponseCard'
import { db } from '../firebase/config'
import useAuth from '../hooks/useAuth'
import { getAICoachAdvice, getAIDailyTip } from '../utils/apiService'

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


const AICoach = () => {
  const { currentUser } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [dailyTip, setDailyTip] = useState('')
  const [weeklySummaryText, setWeeklySummaryText] = useState('')
  const [loadingDailyTip, setLoadingDailyTip] = useState(true)
  const [loadingWeeklySummary, setLoadingWeeklySummary] = useState(true)
  const [dailyOffline, setDailyOffline] = useState(false)
  const [weeklyOffline, setWeeklyOffline] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadCoachAdvice = useCallback(async () => {
    if (!currentUser?.uid) return

    console.log('[AI] Daily tip loader started')
    setLoadingDailyTip(true)
    setLoadingWeeklySummary(true)
    setErrorMessage('')

    try {
      const workoutsRef = collection(db, `users/${currentUser.uid}/workouts`)
      
      // Fetch all workouts ordered by createdAt DESC to find the truly latest
      const allWorkoutsQuery = query(workoutsRef, orderBy('createdAt', 'desc'))
      const allSnapshot = await getDocs(allWorkoutsQuery)
      const allWorkoutsList = allSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      
      console.log('[AI] Workouts found:', allWorkoutsList.length)
      console.log('[AI] Workout IDs:', allWorkoutsList.map((w) => w.id))
      
      const latestWorkoutFromDB = allWorkoutsList[0] || null
      
      if (latestWorkoutFromDB) {
        console.log('[AI] Latest workout selected:', {
          id: latestWorkoutFromDB.id,
          type: latestWorkoutFromDB.type,
          createdAt: toDate(latestWorkoutFromDB.createdAt)?.toISOString(),
        })
      } else {
        console.log('[AI] Latest workout selected: NONE (no workouts found)')
      }

      // Filter to last 7 calendar days for weekly summary stats
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysWorkouts = allWorkoutsList.filter((w) => {
        const wDate = toDate(w.date)
        return wDate && wDate.getTime() >= sevenDaysAgo.getTime()
      })

      console.log('[AI] Weekly workout count (last 7 days):', sevenDaysWorkouts.length)
      console.log('[AI] Workouts included in weekly summary:', sevenDaysWorkouts.map((w) => ({
        id: w.id,
        type: w.type,
        createdAt: toDate(w.createdAt)?.toISOString(),
        date: toDate(w.date)?.toISOString().slice(0, 10),
      })))

      setWorkouts(sevenDaysWorkouts)
      const normalizedWorkouts = sevenDaysWorkouts.map(normalizeWorkout)
      const latestWorkout = normalizedWorkouts[0] || null


  // DAILY TIP: Cache key should always be today's date
      const today = new Date()
      const yearToday = today.getFullYear()
      const monthToday = String(today.getMonth() + 1).padStart(2, '0')
      const dayToday = String(today.getDate()).padStart(2, '0')
      const dailyDocId = `${yearToday}-${monthToday}-${dayToday}`

      console.log('[AI] Daily tip cache key:', dailyDocId)

      const dailyDocRef = doc(db, 'users', currentUser.uid, 'dailyTips', dailyDocId)
      const dailySnapshot = await getDoc(dailyDocRef)
      
      if (dailySnapshot.exists()) {
        const cachedData = dailySnapshot.data()
        console.log('[AI] Cached workout ID:', cachedData.latestWorkoutId)
        
        // Verify cache is fresh by comparing workout IDs
        if (latestWorkoutFromDB && cachedData.latestWorkoutId === latestWorkoutFromDB.id) {
          console.log('[AI] Cache hit')
          setDailyTip(cachedData.advice || '')
          setDailyOffline(Boolean(cachedData.offlineFallback || cachedData.source === 'fallback'))
        } else {
          // Cache is stale - delete it and regenerate
          console.log('[AI] Cache invalidated - workout ID mismatch, regenerating daily tip')
          try {
            await deleteDoc(dailyDocRef)
            console.log('[AI] Deleted stale daily tip cache')
          } catch (err) {
            console.warn('[AICoach] Failed to delete stale daily tip:', err)
          }
          
          if (latestWorkoutFromDB) {
            const normalizedLatest = normalizeWorkout(latestWorkoutFromDB)
            const payload = {
              type: normalizedLatest.type,
              name: normalizedLatest.name || normalizedLatest.activityType || '',
              effort: normalizedLatest.effort || normalizedLatest.feeling || '',
              duration: normalizedLatest.duration || null,
              distance: normalizedLatest.distance || null,
              date: normalizedLatest.date,
            }
            
            const dailyRes = await getAIDailyTip(payload, { userId: currentUser.uid })
            const adviceText = dailyRes?.advice || ''
            setDailyTip(adviceText)
            setDailyOffline(Boolean(dailyRes?.offlineFallback || dailyRes?.source === 'fallback'))
            
            // Cache the generated tip
            try {
              await setDoc(dailyDocRef, {
                advice: adviceText,
                source: dailyRes?.source || 'local',
                offlineFallback: Boolean(dailyRes?.offlineFallback || dailyRes?.source === 'fallback'),
                latestWorkoutId: latestWorkoutFromDB.id,
                latestWorkoutCreatedAt: toDate(latestWorkoutFromDB.createdAt),
                createdAt: serverTimestamp(),
              })
              console.log('[AI] Cached regenerated daily tip')
            } catch (err) {
              console.warn('[AICoach] Failed to cache regenerated daily tip:', err)
            }
          } else {
            // Only show placeholder when NO workouts exist
            console.log('[AI] No workouts found - showing placeholder')
            setDailyTip('Log a workout to receive a concise daily coaching tip once your session is saved.')
            setDailyOffline(false)
          }
        }
      } else {
        // Cache miss - generate and cache the daily tip if workouts exist
        console.log('[AI] Cache miss - generating daily tip')
        
        if (latestWorkoutFromDB) {
          const normalizedLatest = normalizeWorkout(latestWorkoutFromDB)
          const payload = {
            type: normalizedLatest.type,
            name: normalizedLatest.name || normalizedLatest.activityType || '',
            effort: normalizedLatest.effort || normalizedLatest.feeling || '',
            duration: normalizedLatest.duration || null,
            distance: normalizedLatest.distance || null,
            date: normalizedLatest.date,
          }
          
          const dailyRes = await getAIDailyTip(payload, { userId: currentUser.uid })
          const adviceText = dailyRes?.advice || ''
          setDailyTip(adviceText)
          setDailyOffline(Boolean(dailyRes?.offlineFallback || dailyRes?.source === 'fallback'))
          
          // Cache the generated tip
          try {
            await setDoc(dailyDocRef, {
              advice: adviceText,
              source: dailyRes?.source || 'local',
              offlineFallback: Boolean(dailyRes?.offlineFallback || dailyRes?.source === 'fallback'),
              latestWorkoutId: latestWorkoutFromDB.id,
              latestWorkoutCreatedAt: toDate(latestWorkoutFromDB.createdAt),
              createdAt: serverTimestamp(),
            })
            console.log('[AI] Cached generated daily tip')
          } catch (err) {
            console.warn('[AICoach] Failed to cache generated daily tip:', err)
          }
        } else {
          // Only show placeholder when NO workouts exist
          console.log('[AI] No workouts found - showing placeholder')
          setDailyTip('Log a workout to receive a concise daily coaching tip once your session is saved.')
          setDailyOffline(false)
        }
      }

      // WEEKLY SUMMARY: Check cache and regenerate if missing or workout count changed
      const weekId = (() => {
        const refDate = new Date()
        const year = refDate.getFullYear()
        const onejan = new Date(year, 0, 1)
        const week = Math.ceil((((refDate - onejan) / 86400000) + onejan.getDay() + 1) / 7)
        return `${year}-W${String(week).padStart(2, '0')}`
      })()

      const weeklyDocRef = doc(db, 'users', currentUser.uid, 'weeklySummaries', weekId)
      const weeklySnapshot = await getDoc(weeklyDocRef)
      
      if (weeklySnapshot.exists()) {
        const cachedData = weeklySnapshot.data()
        // Check if cached summary is stale by comparing workout count
        if (cachedData.workoutCount !== undefined && cachedData.workoutCount === sevenDaysWorkouts.length) {
          console.log('[AI] Weekly summary cache is fresh')
          setWeeklySummaryText(cachedData.advice || '')
          setWeeklyOffline(Boolean(cachedData.offlineFallback || cachedData.source === 'fallback'))
        } else {
          // Workout count changed - regenerate
          console.log('[AI] Cache invalidated - workout count changed, regenerating weekly summary')
          const weeklyRes = await getAICoachAdvice(normalizedWorkouts, { userId: currentUser.uid })
          const adviceText = weeklyRes?.advice || ''
          setWeeklySummaryText(adviceText)
          setWeeklyOffline(Boolean(weeklyRes?.offlineFallback || weeklyRes?.source === 'fallback'))
          
          try {
            await setDoc(weeklyDocRef, {
              advice: adviceText,
              source: weeklyRes?.source || 'local',
              offlineFallback: Boolean(weeklyRes?.offlineFallback || weeklyRes?.source === 'fallback'),
              workoutCount: sevenDaysWorkouts.length,
              createdAt: serverTimestamp(),
            })
            console.log('[AI] Regenerating weekly summary')
          } catch (err) {
            console.warn('[AICoach] Failed to cache weekly summary:', err)
          }
        }
      } else {
        // No cache - generate and cache
        const weeklyRes = await getAICoachAdvice(normalizedWorkouts, { userId: currentUser.uid })
        const adviceText = weeklyRes?.advice || ''
        setWeeklySummaryText(adviceText)
        setWeeklyOffline(Boolean(weeklyRes?.offlineFallback || weeklyRes?.source === 'fallback'))
        
        try {
          await setDoc(weeklyDocRef, {
            advice: adviceText,
            source: weeklyRes?.source || 'local',
            offlineFallback: Boolean(weeklyRes?.offlineFallback || weeklyRes?.source === 'fallback'),
            workoutCount: sevenDaysWorkouts.length,
            createdAt: serverTimestamp(),
          })
          console.log('[AI] Regenerating weekly summary')
        } catch (err) {
          console.warn('[AICoach] Failed to cache weekly summary:', err)
        }
      }
    } catch (error) {
      console.error('Failed to load AI coach advice:', error)
      setErrorMessage('Could not load AI advice right now. Tap refresh to try again.')
      setDailyTip('')
      setWeeklySummaryText('')
    } finally {
      setLoadingDailyTip(false)
      setLoadingWeeklySummary(false)
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

    const summary = {
      totalWorkouts: workouts.length,
      muscleGroups: Array.from(muscleGroupSet),
      restDays: Math.max(0, WEEK_DAYS - trainedDaySet.size),
      totalCardioDistance: totalCardioDistance.toFixed(2),
    }

    console.log('[AI] Weekly summary stats:', summary)
    return summary
  }, [workouts])

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
            disabled={loadingDailyTip || loadingWeeklySummary}
            className="h-10 rounded-xl border border-primary px-3 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingDailyTip || loadingWeeklySummary ? 'Refreshing...' : 'Refresh Advice'}
          </button>
        </div>

        <AIResponseCard advice={dailyTip} loading={loadingDailyTip} note="Based on your latest workout" offline={dailyOffline} />
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
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">AI-generated weekly summary</p>
            {weeklyOffline && (
              <span className="ml-2 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Coach Quick Tips
              </span>
            )}
          </div>
          {loadingWeeklySummary ? (
            <div className="mt-3 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-zinc-300/60 dark:bg-zinc-700/70" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-300/60 dark:bg-zinc-700/70" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-300/60 dark:bg-zinc-700/70" />
            </div>
          ) : (
            <AIResponseMarkdown
              content={weeklySummaryText || 'Your weekly summary will appear here once your workouts sync.'}
            />
          )}
        </div>
      </section>
    </section>
  )
}

export default AICoach
