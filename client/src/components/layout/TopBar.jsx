import logoDark from '../../assets/logo-dark.svg'
import logoLight from '../../assets/logo-light.svg'

const SunIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M12 2.5v2.3M12 19.2v2.3M21.5 12h-2.3M4.8 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M20 14.3A8.3 8.3 0 1110.7 4a6.8 6.8 0 009.3 10.3z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const BellIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M15.8 17.5H8.2c-1.2 0-1.8-1.4-1-2.3L8 14v-3.1A4 4 0 0112 7a4 4 0 014 3.9V14l.8 1.2c.8.9.2 2.3-1 2.3zM10.2 19a1.8 1.8 0 003.6 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const TopBar = ({ theme, onToggleTheme }) => {
  return (
    <header className="sticky top-0 z-10 border-b border-[#E4E4E7] bg-[#F9F9F9]/95 px-4 py-3 backdrop-blur transition-colors duration-300 dark:border-dark-border dark:bg-dark-bg/95">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <div className="flex items-center">
          <img src={logoLight} alt="FitForge" className="h-8 w-auto dark:hidden" />
          <img src={logoDark} alt="FitForge" className="hidden h-8 w-auto dark:block" />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E4E7] bg-white text-[#111111] transition hover:border-primary hover:text-primary dark:border-dark-border dark:bg-dark-card dark:text-zinc-100"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E4E7] bg-white text-[#111111] transition hover:border-primary hover:text-primary dark:border-dark-border dark:bg-dark-card dark:text-zinc-100"
            aria-label="Notifications coming soon"
          >
            <BellIcon />
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopBar
