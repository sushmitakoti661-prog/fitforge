const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
    <path
      d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4zM18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9zM5.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"
      fill="currentColor"
    />
  </svg>
)

const AIResponseCard = ({ title = "Today's AI Tip", advice = '', loading = false, note = 'Generated based on your last 7 days' }) => {
  return (
    <article className="rounded-2xl border border-[#E4E4E7] border-l-4 border-l-primary bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:border-l-primary dark:bg-dark-card">
      <header className="flex items-center gap-2 text-primary">
        <SparkleIcon />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">AI Coach</p>
      </header>

      <h2 className="mt-2 text-xl font-bold">{title}</h2>

      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-zinc-300/60 dark:bg-zinc-700/70" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-300/60 dark:bg-zinc-700/70" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-300/60 dark:bg-zinc-700/70" />
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#111111] dark:text-white">{advice}</p>
      )}

      <p className="mt-3 text-xs text-[#6B7280] dark:text-zinc-400">{note}</p>
    </article>
  )
}

export default AIResponseCard

