import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import logoDark from '../../assets/logo-dark.svg'
import logoLight from '../../assets/logo-light.svg'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.95h5.5c-.23 1.27-.94 2.35-2.01 3.07l3.25 2.52C20.63 17.98 21.5 15.3 21.5 12c0-.61-.05-1.2-.16-1.78z"
    />
    <path
      fill="#34A853"
      d="M12 21.5c2.97 0 5.46-.98 7.28-2.66l-3.25-2.52c-.9.61-2.06.97-4.03.97-3.1 0-5.72-2.1-6.66-4.92l-3.36 2.59C3.78 18.89 7.58 21.5 12 21.5z"
    />
    <path
      fill="#4A90E2"
      d="M5.34 12.37a7.42 7.42 0 010-4.74L1.98 5.04a11.44 11.44 0 000 9.92z"
    />
    <path
      fill="#FBBC05"
      d="M12 6.71c1.61 0 3.06.55 4.2 1.64l3.14-3.14C17.45 3.43 14.97 2.5 12 2.5 7.58 2.5 3.78 5.11 1.98 9.04l3.36 2.59c.94-2.82 3.56-4.92 6.66-4.92z"
    />
  </svg>
)

const getSignupError = (errorCode) => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return { email: 'An account with this email already exists.' }
    case 'auth/invalid-email':
      return { email: 'Enter a valid email address.' }
    case 'auth/weak-password':
      return { password: 'Password should be at least 6 characters.' }
    default:
      return { password: 'Account creation failed. Please try again.' }
  }
}

const Signup = () => {
  const navigate = useNavigate()
  const { signup, loginWithGoogle } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleEmailSignup = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.'
    if (!email.trim()) nextErrors.email = 'Email is required.'
    if (!password) nextErrors.password = 'Password is required.'
    if (!confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.'
    if (password && confirmPassword && password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      await signup(fullName, email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrors(getSignupError(error.code))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignup = async () => {
    setErrors({})
    setIsGoogleLoading(true)
    try {
      await loginWithGoogle()
      navigate('/dashboard', { replace: true })
    } catch {
      setErrors({ google: 'Google sign-up failed. Please try again.' })
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <picture>
            <source media="(prefers-color-scheme: light)" srcSet={logoLight} />
            <img src={logoDark} alt="FitForge" className="mx-auto h-12 w-auto" />
          </picture>
          <p className="mt-3 text-sm tracking-wide text-zinc-300">Forge Your Strength.</p>
        </div>

        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-12 w-full rounded-xl border border-dark-border bg-dark-card px-4 text-base text-white outline-none transition focus:border-primary"
              placeholder="John Doe"
            />
            {errors.fullName ? <p className="mt-2 text-sm text-danger">{errors.fullName}</p> : null}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-xl border border-dark-border bg-dark-card px-4 text-base text-white outline-none transition focus:border-primary"
              placeholder="you@example.com"
            />
            {errors.email ? <p className="mt-2 text-sm text-danger">{errors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
              Password
            </label>
            <div className="flex h-12 items-center rounded-xl border border-dark-border bg-dark-card pr-3 transition focus-within:border-primary">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-full w-full rounded-xl bg-transparent px-4 text-base text-white outline-none"
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs font-semibold uppercase tracking-wide text-zinc-300"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password ? <p className="mt-2 text-sm text-danger">{errors.password}</p> : null}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-400"
            >
              Confirm Password
            </label>
            <div className="flex h-12 items-center rounded-xl border border-dark-border bg-dark-card pr-3 transition focus-within:border-primary">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-full w-full rounded-xl bg-transparent px-4 text-base text-white outline-none"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="text-xs font-semibold uppercase tracking-wide text-zinc-300"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.confirmPassword ? <p className="mt-2 text-sm text-danger">{errors.confirmPassword}</p> : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-dark-border" />
          <span className="text-sm text-zinc-400">or</span>
          <div className="h-px flex-1 bg-dark-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={isGoogleLoading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dark-border bg-dark-card text-sm font-semibold text-white transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <GoogleIcon />
          {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>
        {errors.google ? <p className="mt-2 text-sm text-danger">{errors.google}</p> : null}

        <p className="mt-8 text-center text-sm text-zinc-300">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
