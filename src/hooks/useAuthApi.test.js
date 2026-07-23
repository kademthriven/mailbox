import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { useAuthApi } from './useAuthApi'

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../firebase', () => ({
  auth: { name: 'hook-auth' },
}))

describe('useAuthApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('routes account creation through Firebase Authentication', async () => {
    createUserWithEmailAndPassword.mockResolvedValueOnce({ user: {} })
    const { result } = renderHook(() => useAuthApi())

    await result.current.createAccount('person@example.com', 'secret123')

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      { name: 'hook-auth' },
      'person@example.com',
      'secret123',
    )
    expect(result.current.isAuthAvailable).toBe(true)
  })

  it('routes login and logout through Firebase Authentication', async () => {
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: {} })
    signOut.mockResolvedValueOnce()
    const { result } = renderHook(() => useAuthApi())

    await result.current.authenticate('person@example.com', 'secret123')
    await result.current.endSession()

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      { name: 'hook-auth' },
      'person@example.com',
      'secret123',
    )
    expect(signOut).toHaveBeenCalledWith({ name: 'hook-auth' })
  })

  it('keeps authentication callback references stable', () => {
    const { result, rerender } = renderHook(() => useAuthApi())
    const firstCallbacks = result.current

    rerender()

    expect(result.current.createAccount).toBe(firstCallbacks.createAccount)
    expect(result.current.authenticate).toBe(firstCallbacks.authenticate)
    expect(result.current.endSession).toBe(firstCallbacks.endSession)
  })
})
