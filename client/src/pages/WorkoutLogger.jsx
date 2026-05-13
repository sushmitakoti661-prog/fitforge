import { useMemo, useState } from 'react'
import { Timestamp, addDoc, collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import WorkoutCard from '../components/ui/WorkoutCard'
import StreakCelebrationOverlay from '../components/ui/StreakCelebrationOverlay'
import { db } from '../firebase/config'
import useAuth from '../hooks/useAuth'
import useWorkouts from '../hooks/useWorkouts'
import { calculateLongestStreak, calculateStreak } from '../utils/streakUtils'

const activityTypes = ['Running', 'Cycling', 'Swimming', 'Walking', 'Other']
const feelingOptions = [
  { id: 'easy', label: 'Easy 😊' },
  { id: 'moderate', label: 'Moderate 💪' },
  { id: 'hard', label: 'Hard 🔥' },
]
const muscleGroupOptions = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full Body']
const exerciseSuggestions = [
  'Bench Press',
  'Incline Bench Press',
  'Push Up',
  'Squat',
  'Deadlift',
  'Romanian Deadlift',
  'Pull Up',
  'Lat Pulldown',
  'Bent Over Row',
  'Overhead Press',
  'Bicep Curl',
  'Tricep Dip',
  'Leg Press',
  'Lunges',
  'Plank',
  'Crunches',
  'Hip Thrust',
  'Face Pull',
  'Cable Fly',
  'Dumbbell Row',
]

const formatPace = (paceValue) => {
  if (!Number.isFinite(paceValue) || paceValue <= 0) return '--:-- /km'
  const totalSeconds = Math.round(paceValue * 60)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds} /km`
}

const toLocalMidnightTimestamp = (dateValue) => {
  const date = new Date(`${dateValue}T00:00:00`)
  return Timestamp.fromDate(date)
}

const getTodayInputDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createEmptyExercise = () => ({ name: '', sets: [{ reps: '', weight: '' }] })

const WorkoutLogger = () => {
  const { currentUser } = useAuth()
  const { workouts, loading, refreshWorkouts } = useWorkouts()
  const [workoutType, setWorkoutType] = useState('cardio')
  const [submitMessage, setSubmitMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCoachLink, setShowCoachLink] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [milestone, setMilestone] = useState(null)

  const [cardioForm, setCardioForm] = useState({
    activityType: 'Running',
    unit: 'km',
    distance: '',
    duration: '',
    feeling: 'moderate',
    notes: '',
    date: getTodayInputDate(),
  })

  const [weightForm, setWeightForm] = useState({
    workoutName: '',
    muscleGroups: [],
    exercises: [createEmptyExercise()],
    feeling: 'moderate',
    notes: '',
    date: getTodayInputDate(),
  })

  const distanceRaw = Number(cardioForm.distance)
  const durationRaw = Number(cardioForm.duration)
  const distanceKm = cardioForm.unit === 'miles' ? distanceRaw * 1.60934 : distanceRaw
  const paceValue = durationRaw > 0 && distanceKm > 0 ? durationRaw / distanceKm : NaN
  const paceLabel = useMemo(() => formatPace(paceValue), [paceValue])

  const selectWorkoutType = (type) => {
    setWorkoutType(type)
    setSubmitMessage('')
    setErrorMessage('')
    setShowCoachLink(false)
  }

  const toggleMuscleGroup = (muscleGroup) => {
    setWeightForm((prev) => {
      const exists = prev.muscleGroups.includes(muscleGroup)
      const nextGroups = exists ? prev.muscleGroups.filter((item) => item !== muscleGroup) : [...prev.muscleGroups, muscleGroup]
      return { ...prev, muscleGroups: nextGroups }
    })
  }

  const updateExerciseName = (exerciseIndex, value) => {
    setWeightForm((prev) => {
      const nextExercises = prev.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, name: value } : exercise,
      )
      return { ...prev, exercises: nextExercises }
    })
  }

  const updateExerciseSet = (exerciseIndex, setIndex, field, value) => {
    setWeightForm((prev) => {
      const nextExercises = prev.exercises.map((exercise, index) => {
        if (index !== exerciseIndex) return exercise
        const nextSets = exercise.sets.map((setItem, localSetIndex) =>
          localSetIndex === setIndex ? { ...setItem, [field]: value } : setItem,
        )
        return { ...exercise, sets: nextSets }
      })
      return { ...prev, exercises: nextExercises }
    })
  }

  const addSetToExercise = (exerciseIndex) => {
    setWeightForm((prev) => {
      const nextExercises = prev.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, sets: [...exercise.sets, { reps: '', weight: '' }] } : exercise,
      )
      return { ...prev, exercises: nextExercises }
    })
  }

  const addAnotherExercise = () => {
    setWeightForm((prev) => ({ ...prev, exercises: [...prev.exercises, createEmptyExercise()] }))
  }

  const saveCardioWorkout = async () => {
    const duration = Number(cardioForm.duration)
    if (!currentUser?.uid) throw new Error('No authenticated user found.')
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) throw new Error('Distance must be greater than zero.')
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Duration must be greater than zero.')
    if (!Number.isFinite(paceValue) || paceValue <= 0) throw new Error('Pace could not be calculated.')

    const workoutPayload = {
      type: 'cardio',
      date: toLocalMidnightTimestamp(cardioForm.date),
      activityType: cardioForm.activityType,
      distance: Number(distanceKm.toFixed(3)),
      duration: Number(duration.toFixed(2)),
      pace: Number(paceValue.toFixed(4)),
      feeling: cardioForm.feeling,
      notes: cardioForm.notes.trim(),
      createdAt: serverTimestamp(),
    }

    await addDoc(collection(db, `users/${currentUser.uid}/workouts`), workoutPayload)
    setCardioForm((prev) => ({
      ...prev,
      distance: '',
      duration: '',
      notes: '',
      feeling: 'moderate',
      date: getTodayInputDate(),
    }))
  }

  const saveWeightWorkout = async () => {
    if (!currentUser?.uid) throw new Error('No authenticated user found.')
    if (!weightForm.workoutName.trim()) throw new Error('Workout name is required.')
    if (!weightForm.muscleGroups.length) throw new Error('Select at least one muscle group.')
    if (!weightForm.exercises.length) throw new Error('Add at least one exercise.')

    const normalizedExercises = weightForm.exercises.map((exercise) => {
      const name = exercise.name.trim()
      if (!name) throw new Error('Each exercise must have a name.')

      const normalizedSets = exercise.sets.map((setItem) => {
        const reps = Number(setItem.reps)
        const weightNumber = setItem.weight === '' ? null : Number(setItem.weight)

        if (!Number.isFinite(reps) || reps <= 0) throw new Error('Reps must be greater than zero for every set.')
        if (weightNumber !== null && (!Number.isFinite(weightNumber) || weightNumber < 0)) {
          throw new Error('Weight must be a positive number when provided.')
        }

        return { reps, weight: weightNumber }
      })

      if (!normalizedSets.length) throw new Error('Each exercise must include at least one set.')
      return { name, sets: normalizedSets }
    })

    const workoutPayload = {
      type: 'weight_training',
      date: toLocalMidnightTimestamp(weightForm.date),
      workoutName: weightForm.workoutName.trim(),
      muscleGroups: weightForm.muscleGroups,
      exercises: normalizedExercises,
      feeling: weightForm.feeling,
      notes: weightForm.notes.trim(),
      createdAt: serverTimestamp(),
    }

    await addDoc(collection(db, `users/${currentUser.uid}/workouts`), workoutPayload)
    setWeightForm({
      workoutName: '',
      muscleGroups: [],
      exercises: [createEmptyExercise()],
      feeling: 'moderate',
      notes: '',
      date: getTodayInputDate(),
    })
  }

  const getAllWorkoutsForStats = async () => {
    if (!currentUser?.uid) return []
    const workoutsRef = collection(db, `users/${currentUser.uid}/workouts`)
    const snapshot = await getDocs(workoutsRef)
    return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
  }

  const getPreviousProfileStreak = async () => {
    if (!currentUser?.uid) return 0
    const profileRef = doc(db, 'users', currentUser.uid)
    const profileSnapshot = await getDoc(profileRef)
    return profileSnapshot.exists() ? profileSnapshot.data()?.currentStreak || 0 : 0
  }

  const updateUserProfileStats = async (workouts) => {
    if (!currentUser?.uid) return 0
    const currentStreak = calculateStreak(workouts)
    const longestStreak = calculateLongestStreak(workouts)
    const totalWorkouts = workouts.length

    const latestWorkout = workouts
      .filter((workout) => workout.date)
      .sort((a, b) => {
        const aDate = typeof a.date.toDate === 'function' ? a.date.toDate() : new Date(a.date)
        const bDate = typeof b.date.toDate === 'function' ? b.date.toDate() : new Date(b.date)
        return bDate.getTime() - aDate.getTime()
      })[0]

    const profileRef = doc(db, 'users', currentUser.uid)
    await setDoc(
      profileRef,
      {
        currentStreak,
        longestStreak,
        lastWorkoutDate: latestWorkout?.date || serverTimestamp(),
        totalWorkouts,
      },
      { merge: true },
    )

    return currentStreak
  }

  const handleSaveWorkout = async (event) => {
    event.preventDefault()
    setSaving(true)
    setSubmitMessage('')
    setErrorMessage('')
    setShowCoachLink(false)

    try {
      if (workoutType === 'cardio') {
        await saveCardioWorkout()
      } else {
        await saveWeightWorkout()
      }

      const previousStreak = await getPreviousProfileStreak()
      const allWorkouts = await getAllWorkoutsForStats()
      const newStreak = await updateUserProfileStats(allWorkouts)

      if ([7, 30, 50, 100].includes(newStreak) && previousStreak < newStreak) {
        setMilestone(newStreak)
      }

      await refreshWorkouts()
      setSubmitMessage('Workout saved successfully.')
      setShowCoachLink(true)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save workout.')
      setShowCoachLink(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <StreakCelebrationOverlay milestone={milestone} onClose={() => setMilestone(null)} />
      <header className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Workout Logger</p>
        <h1 className="mt-2 text-2xl font-bold">Log today&apos;s training</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => selectWorkoutType('cardio')}
          className={`h-12 rounded-xl border text-sm font-semibold transition ${
            workoutType === 'cardio'
              ? 'border-primary bg-primary text-white'
              : 'border-[#E4E4E7] bg-[#F1F1F1] text-[#111111] dark:border-dark-border dark:bg-dark-card dark:text-zinc-200'
          }`}
        >
          Cardio
        </button>
        <button
          type="button"
          onClick={() => selectWorkoutType('weight_training')}
          className={`h-12 rounded-xl border text-sm font-semibold transition ${
            workoutType === 'weight_training'
              ? 'border-primary bg-primary text-white'
              : 'border-[#E4E4E7] bg-[#F1F1F1] text-[#111111] dark:border-dark-border dark:bg-dark-card dark:text-zinc-200'
          }`}
        >
          Weight Training
        </button>
      </div>

      <form onSubmit={handleSaveWorkout} className="space-y-4 rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        {workoutType === 'cardio' ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Activity Type</span>
              <select
                value={cardioForm.activityType}
                onChange={(event) => setCardioForm((prev) => ({ ...prev, activityType: event.target.value }))}
                className="h-11 w-full rounded-xl border border-[#E4E4E7] bg-white px-3 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-bg"
              >
                {activityTypes.map((activity) => (
                  <option key={activity} value={activity}>
                    {activity}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-2 block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Distance</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cardioForm.distance}
                  onChange={(event) => setCardioForm((prev) => ({ ...prev, distance: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-[#E4E4E7] bg-white px-3 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-bg"
                  placeholder="0.00"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Unit</span>
                <select
                  value={cardioForm.unit}
                  onChange={(event) => setCardioForm((prev) => ({ ...prev, unit: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-[#E4E4E7] bg-white px-3 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-bg"
                >
                  <option value="km">km</option>
                  <option value="miles">miles</option>
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Duration (minutes)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={cardioForm.duration}
                onChange={(event) => setCardioForm((prev) => ({ ...prev, duration: event.target.value }))}
                className="h-11 w-full rounded-xl border border-[#E4E4E7] bg-white px-3 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-bg"
                placeholder="0"
              />
            </label>

            <div className="rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 dark:border-dark-border dark:bg-dark-bg">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Average Pace</p>
              <p className="mt-1 text-lg font-bold">{paceLabel}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">How did it feel?</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {feelingOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setCardioForm((prev) => ({ ...prev, feeling: option.id }))}
                    className={`h-11 rounded-xl border text-xs font-semibold transition ${
                      cardioForm.feeling === option.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-[#E4E4E7] bg-white text-[#374151] dark:border-dark-border dark:bg-dark-bg dark:text-zinc-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Notes (optional)</span>
              <textarea
                value={cardioForm.notes}
                onChange={(event) => setCardioForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-bg"
                placeholder="How was the session?"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Date</span>
              <input
                type="date"
                value={cardioForm.date}
                onChange={(event) => setCardioForm((prev) => ({ ...prev, date: event.target.value }))}
                className="h-11 w-full rounded-xl border border-[#E4E4E7] bg-white px-3 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-bg"
              />
            </label>
          </>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Workout Name</span>
              <input
                type="text"
                value={weightForm.workoutName}
                onChange={(event) => setWeightForm((prev) => ({ ...prev, workoutName: event.target.value }))}
                className="h-11 w-full rounded-xl border border-[#E4E4E7] bg-white px-3 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-bg"
                placeholder="e.g. Leg Day"
              />
            </label>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Muscle Groups</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {muscleGroupOptions.map((muscleGroup) => {
                  const isActive = weightForm.muscleGroups.includes(muscleGroup)
                  return (
                    <button
                      key={muscleGroup}
                      type="button"
                      onClick={() => toggleMuscleGroup(muscleGroup)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? 'border-primary bg-primary text-white'
                          : 'border-[#E4E4E7] bg-white text-[#374151] dark:border-dark-border dark:bg-dark-bg dark:text-zinc-300'
                      }`}
                    >
                      {muscleGroup}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Exercises</p>
              {weightForm.exercises.map((exercise, exerciseIndex) => (
                <div key={`exercise-${exerciseIndex}`} className="rounded-xl border border-[#E4E4E7] bg-white p-3 dark:border-dark-border dark:bg-dark-bg">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">
                      Exercise Name
                    </span>
                    <input
                      type="text"
                      list="exercise-suggestion-list"
                      value={exercise.name}
                      onChange={(event) => updateExerciseName(exerciseIndex, event.target.value)}
                      className="h-10 w-full rounded-lg border border-[#E4E4E7] bg-white px-3 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-card"
                      placeholder="Start typing exercise name"
                    />
                  </label>

                  <div className="mt-3 space-y-2">
                    {exercise.sets.map((setItem, setIndex) => (
                      <div key={`set-${exerciseIndex}-${setIndex}`} className="grid grid-cols-3 gap-2">
                        <p className="flex items-center text-xs font-semibold text-[#6B7280] dark:text-zinc-400">Set {setIndex + 1}</p>
                        <input
                          type="number"
                          min="1"
                          value={setItem.reps}
                          onChange={(event) => updateExerciseSet(exerciseIndex, setIndex, 'reps', event.target.value)}
                          className="h-10 rounded-lg border border-[#E4E4E7] bg-white px-2 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-card"
                          placeholder="Reps"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={setItem.weight}
                          onChange={(event) => updateExerciseSet(exerciseIndex, setIndex, 'weight', event.target.value)}
                          className="h-10 rounded-lg border border-[#E4E4E7] bg-white px-2 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-card"
                          placeholder="Weight kg"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addSetToExercise(exerciseIndex)}
                    className="mt-3 h-10 rounded-lg border border-primary px-3 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-white"
                  >
                    Add Set
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addAnotherExercise}
                className="h-11 w-full rounded-xl border border-primary px-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
              >
                Add Another Exercise
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">How did it feel?</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {feelingOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setWeightForm((prev) => ({ ...prev, feeling: option.id }))}
                    className={`h-11 rounded-xl border text-xs font-semibold transition ${
                      weightForm.feeling === option.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-[#E4E4E7] bg-white text-[#374151] dark:border-dark-border dark:bg-dark-bg dark:text-zinc-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Notes (optional)</span>
              <textarea
                value={weightForm.notes}
                onChange={(event) => setWeightForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-[#E4E4E7] bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-bg"
                placeholder="Session notes"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Date</span>
              <input
                type="date"
                value={weightForm.date}
                onChange={(event) => setWeightForm((prev) => ({ ...prev, date: event.target.value }))}
                className="h-11 w-full rounded-xl border border-[#E4E4E7] bg-white px-3 text-sm outline-none focus:border-primary dark:border-dark-border dark:bg-dark-bg"
              />
            </label>
          </>
        )}

        {submitMessage ? <p className="text-sm font-medium text-success">{submitMessage}</p> : null}
        {showCoachLink ? (
          <Link to="/coach" className="inline-block text-sm font-semibold text-primary underline-offset-2 hover:underline">
            See what your AI Coach thinks &rarr;
          </Link>
        ) : null}
        {errorMessage ? <p className="text-sm font-medium text-danger">{errorMessage}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Save Workout'}
        </button>
      </form>

      <datalist id="exercise-suggestion-list">
        {exerciseSuggestions.map((exercise) => (
          <option key={exercise} value={exercise} />
        ))}
      </datalist>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Recent Workouts</h2>
          {loading ? <span className="text-xs text-[#6B7280] dark:text-zinc-400">Loading...</span> : null}
        </div>

        {!loading && workouts.length === 0 ? (
          <div className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 text-sm text-[#6B7280] transition-colors duration-300 dark:border-dark-border dark:bg-dark-card dark:text-zinc-400">
            No workouts logged yet. Your recent sessions will appear here.
          </div>
        ) : null}

        <div className="space-y-3">
          {workouts.slice(0, 7).map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} onClick={() => setSelectedWorkout(workout)} />
          ))}
        </div>
      </section>

      {selectedWorkout && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 transition-opacity duration-300 sm:items-center sm:justify-center"
          onClick={() => setSelectedWorkout(null)}
        >
          <div
            className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#E4E4E7] bg-[#F1F1F1] p-6 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold flex-1">Workout Details</h2>
              <button
                type="button"
                onClick={() => setSelectedWorkout(null)}
                className="rounded-full p-2 hover:bg-black/10 dark:hover:bg-white/10"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-dark-border dark:bg-dark-bg">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">
                  {selectedWorkout.type === 'cardio' ? 'Cardio Workout' : 'Weight Training'}
                </p>
                <p className="mt-2 text-xl font-bold">
                  {selectedWorkout.type === 'cardio' ? selectedWorkout.activityType : selectedWorkout.workoutName}
                </p>
              </div>

              {selectedWorkout.type === 'cardio' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-dark-border dark:bg-dark-bg">
                    <p className="text-2xl font-black">{Number(selectedWorkout.distance || 0).toFixed(2)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">km</p>
                  </div>
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-dark-border dark:bg-dark-bg">
                    <p className="text-2xl font-black">{Number(selectedWorkout.duration || 0).toFixed(0)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">minutes</p>
                  </div>
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-dark-border dark:bg-dark-bg">
                    <p className="text-2xl font-black">{formatPace(selectedWorkout.pace)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Pace</p>
                  </div>
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-dark-border dark:bg-dark-bg">
                    <p className="text-lg font-bold">{selectedWorkout.feeling === 'easy' ? '😊' : selectedWorkout.feeling === 'hard' ? '🔥' : '💪'}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Feeling</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedWorkout.muscleGroups?.length > 0 && (
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-dark-border dark:bg-dark-bg">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">
                        Muscle Groups
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedWorkout.muscleGroups.map((group) => (
                          <span
                            key={group}
                            className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
                          >
                            {group}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedWorkout.exercises?.length > 0 && (
                    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-dark-border dark:bg-dark-bg">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">
                        Exercises
                      </p>
                      <div className="mt-3 space-y-3">
                        {selectedWorkout.exercises.map((exercise, idx) => (
                          <div key={idx} className="border-t border-[#E5E7EB] pt-3 first:border-0 first:pt-0 dark:border-dark-border">
                            <p className="font-semibold">{exercise.name}</p>
                            {exercise.sets?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {exercise.sets.map((set, setIdx) => (
                                  <p key={setIdx} className="text-sm text-[#6B7280] dark:text-zinc-400">
                                    Set {setIdx + 1}: {set.reps} reps
                                    {set.weight ? ` @ ${set.weight} kg` : ''}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-dark-border dark:bg-dark-bg">
                    <p className="text-lg font-bold">{selectedWorkout.feeling === 'easy' ? '😊' : selectedWorkout.feeling === 'hard' ? '🔥' : '💪'}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Feeling</p>
                  </div>
                </div>
              )}

              {selectedWorkout.notes && (
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-dark-border dark:bg-dark-bg">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">
                    Notes
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{selectedWorkout.notes}</p>
                </div>
              )}

              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-dark-border dark:bg-dark-bg">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">
                  Date
                </p>
                <p className="mt-2 text-sm">
                  {selectedWorkout.date
                    ? typeof selectedWorkout.date.toDate === 'function'
                      ? selectedWorkout.date.toDate().toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : new Date(selectedWorkout.date).toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                    : 'No date'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default WorkoutLogger
