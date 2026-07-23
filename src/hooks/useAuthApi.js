import { useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from '../firebase'

export function useAuthApi() {
  const createAccount = useCallback((email, password) => {
    return createUserWithEmailAndPassword(auth, email, password)
  }, [])

  const authenticate = useCallback((email, password) => {
    return signInWithEmailAndPassword(auth, email, password)
  }, [])

  const endSession = useCallback(() => {
    return auth ? signOut(auth) : Promise.resolve()
  }, [])

  return {
    createAccount,
    authenticate,
    endSession,
    isAuthAvailable: Boolean(auth),
  }
}
