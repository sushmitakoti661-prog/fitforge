import { useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase/config'
import { AuthContext } from './authContext'

const googleProvider = new GoogleAuthProvider()

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const signup = async (fullName, email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    if (fullName?.trim()) {
      await updateProfile(userCredential.user, { displayName: fullName.trim() })
    }

    return userCredential
  }

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const loginWithGoogle = () => signInWithPopup(auth, googleProvider)
  const logout = () => signOut(auth)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      login,
      signup,
      loginWithGoogle,
      logout,
    }),
    [currentUser, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
