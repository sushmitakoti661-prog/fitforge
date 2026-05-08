import useAuth from '../hooks/useAuth'

const Dashboard = () => {
  const { currentUser } = useAuth()
  const fallbackName = currentUser?.email?.split('@')[0] || 'Athlete'
  const firstName = (currentUser?.displayName || fallbackName).split(' ')[0]
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#6B7280] dark:text-zinc-400">Dashboard</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight">Welcome back, {firstName}!</h1>
        <p className="mt-1 text-sm text-[#6B7280] dark:text-zinc-400">{today}</p>
      </div>

      <div className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Streak</p>
        <p className="mt-2 text-3xl font-extrabold">0 days</p>
        <p className="mt-2 text-sm text-[#6B7280] dark:text-zinc-400">Streak module lands in Phase 9.</p>
      </div>

      <div className="rounded-2xl border border-[#E4E4E7] bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:bg-dark-card">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] dark:text-zinc-400">Recent Workouts</p>
        <p className="mt-2 text-2xl font-bold">No workouts yet</p>
        <p className="mt-2 text-sm text-[#6B7280] dark:text-zinc-400">Workout logging arrives in Phase 4.</p>
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
