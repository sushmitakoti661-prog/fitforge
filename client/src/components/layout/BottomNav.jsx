import { NavLink } from 'react-router-dom'

const HomeIcon = ({ isActive }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M3.2 10.8L12 3.8l8.8 7v8a1.8 1.8 0 01-1.8 1.8H5a1.8 1.8 0 01-1.8-1.8z"
      stroke={isActive ? '#FF5722' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
)

const PlusIcon = ({ isActive }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke={isActive ? '#FF5722' : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const MapIcon = ({ isActive }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M3.5 6.5l5-2 7 2 5-2V18l-5 2-7-2-5 2zM8.5 4.5V18.5M15.5 6.5V20.5"
      stroke={isActive ? '#FF5722' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
)

const ChatIcon = ({ isActive }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M5 5.5h14a1.5 1.5 0 011.5 1.5v8a1.5 1.5 0 01-1.5 1.5H10l-4.5 3v-3H5A1.5 1.5 0 013.5 15V7A1.5 1.5 0 015 5.5z"
      stroke={isActive ? '#FF5722' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
)

const UserIcon = ({ isActive }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <circle cx="12" cy="8.5" r="3.5" stroke={isActive ? '#FF5722' : 'currentColor'} strokeWidth="1.8" />
    <path
      d="M5 19.5a7 7 0 0114 0"
      stroke={isActive ? '#FF5722' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/log', label: 'Log', icon: PlusIcon },
  { to: '/roadmap', label: 'Roadmap', icon: MapIcon },
  { to: '/chat', label: 'Chat', icon: ChatIcon },
  { to: '/profile', label: 'Profile', icon: UserIcon },
]

const BottomNav = () => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E4E4E7] bg-[#F1F1F1]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur transition-colors duration-300 dark:border-dark-border dark:bg-dark-card/95">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-5 gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[52px] flex-col items-center justify-center rounded-xl text-[11px] font-medium ${
                isActive ? 'text-primary' : 'text-[#6B7280] dark:text-zinc-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon isActive={isActive} />
                <span className="mt-1">{label}</span>
                <span className={`mt-1 h-1 w-1 rounded-full ${isActive ? 'bg-primary' : 'bg-transparent'}`} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
