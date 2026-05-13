const MILESTONE_MESSAGES = {
  7: "One week strong! You're building real habits.",
  30: "30 days! You're not just working out, you're transforming.",
  50: "50 days strong. Your consistency is becoming your identity.",
  100: '100 DAYS. You are unstoppable.',
}

const StreakCelebrationOverlay = ({ milestone, onClose }) => {
  if (!milestone) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#0D0D0D] p-8 text-center text-white shadow-2xl">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-orange-500 text-6xl shadow-xl animate-bounce">🔥</div>
        <p className="text-5xl font-black tracking-tight text-orange-300">{milestone} DAYS</p>
        <p className="mt-4 text-lg text-slate-200">{MILESTONE_MESSAGES[milestone]}</p>
        <p className="mt-2 text-sm text-slate-400">Keep your streak alive and watch your progress compound.</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1F2937] transition hover:bg-slate-200"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default StreakCelebrationOverlay
