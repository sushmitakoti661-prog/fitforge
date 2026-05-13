const StreakBadge = ({ streak }) => {
  return (
    <div className="rounded-3xl border border-[#E4E4E7] bg-[#FFF3E0] p-4 text-center shadow-sm transition-colors duration-300 dark:border-dark-border dark:bg-[#3A250C] dark:text-white">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500 text-3xl shadow-lg">🔥</div>
      <p className="mt-4 text-4xl font-black text-[#B45309] dark:text-orange-200">{streak}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#92400E] dark:text-orange-300">day streak</p>
    </div>
  )
}

export default StreakBadge

