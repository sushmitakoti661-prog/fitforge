import ReactMarkdown from 'react-markdown'

const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
    <path
      d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4zM18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9zM5.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"
      fill="currentColor"
    />
  </svg>
)

const markdownComponents = {
  p: ({ node, ...props }) => <p className="mt-0" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-orange-600 dark:text-orange-300" {...props} />,
  em: ({ node, ...props }) => <em className="font-medium italic text-zinc-600 dark:text-zinc-400" {...props} />,
  h1: ({ node, ...props }) => <h1 className="mt-4 text-base font-bold text-orange-600" {...props} />,
  h2: ({ node, ...props }) => <h2 className="mt-4 text-base font-semibold text-orange-600" {...props} />,
  h3: ({ node, ...props }) => <h3 className="mt-3 text-sm font-semibold text-orange-500" {...props} />,
  ul: ({ node, ...props }) => <ul className="mt-3 list-disc space-y-2 pl-5" {...props} />,
  ol: ({ node, ...props }) => <ol className="mt-3 list-decimal space-y-2 pl-5" {...props} />,
  li: ({ node, ...props }) => <li className="break-words" {...props} />,
}

export const AIResponseMarkdown = ({ content = '' }) => (
  <div className="mt-3 space-y-4 text-sm leading-7 text-[#111111] dark:text-white">
    <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
  </div>
)

const AIResponseCard = ({ title = "Today's AI Tip", advice = '', loading = false, note = 'Based on your latest workout', offline = false }) => {
  return (
    <article className="rounded-2xl border border-[#E4E4E7] border-l-4 border-l-primary bg-[#F1F1F1] p-4 transition-colors duration-300 dark:border-dark-border dark:border-l-primary dark:bg-dark-card">
      <header className="flex items-center gap-2 text-primary">
        <SparkleIcon />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">AI Coach</p>
        {offline && (
          <span className="ml-auto inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Coach Quick Tips
          </span>
        )}
      </header>

      <h2 className="mt-2 text-xl font-bold">{title}</h2>

      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-zinc-300/60 dark:bg-zinc-700/70" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-300/60 dark:bg-zinc-700/70" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-300/60 dark:bg-zinc-700/70" />
        </div>
      ) : (
        <AIResponseMarkdown content={advice || ''} />
      )}

      <p className="mt-3 text-xs text-[#6B7280] dark:text-zinc-400">{note}</p>
    </article>
  )
}

export default AIResponseCard

