const RunIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M14 5.2a1.6 1.6 0 110-3.2 1.6 1.6 0 010 3.2zM9 20.5l2.2-5.3 2.6 1.1 1.3 4.2M7.2 13.8l4-1.4 1.3-3.4 3 1M5 20.5l2.3-4.7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const DumbbellIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M3 9.5h2v5H3zM19 9.5h2v5h-2zM6 8h2v8H6zM16 8h2v8h-2zM9 11h6v2H9z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const feelingStyles = {
  easy: { dot: 'bg-success', label: 'Easy' },
  moderate: { dot: 'bg-primary', label: 'Moderate' },
  hard: { dot: 'bg-danger', label: 'Hard' },
}

const formatDate = (value) => {
  if (!value) return 'No date'
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const WorkoutCard = ({ workout }) => {
  const isCardio = workout.type === 'cardio'
  const title = isCardio ? workout.activityType || 'Cardio Workout' : workout.workoutName || 'Weight Training'
  const stats = isCardio
    ? `${Number(workout.distance || 0).toFixed(2)} km • ${Number(workout.duration || 0)} min`
    : `${(workout.muscleGroups || []).join(' • ')} • ${(workout.exercises || []).length} exercises`
  const feeling = feelingStyles[workout.feeling] || feelingStyles.moderate

  return (
    <article className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-full bg-primary/15 p-2 text-primary">{isCardio ? <RunIcon /> : <DumbbellIcon />}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{title}</p>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-zinc-400">{stats}</p>
          {!isCardio && workout.muscleGroups?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {workout.muscleGroups.map((group) => (
                <span
                  key={`${workout.id}-${group}`}
                  className="rounded-full border border-[#D4D4D8] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#6B7280] dark:border-dark-border dark:text-zinc-400"
                >
                  {group}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[#6B7280] dark:text-zinc-400">
        <span>{formatDate(workout.date)}</span>
        <span className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${feeling.dot}`} />
          {feeling.label}
        </span>
      </div>
    </article>
  )
}

export default WorkoutCard

