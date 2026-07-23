import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import {
  deleteMail,
  getMailboxFolder,
  markMailAsRead,
  sendMail,
} from '../mailService'
import { AUTH_TOKEN_KEY } from '../storageKeys'
import { useMailApi } from './useMailApi'

vi.mock('../mailService', () => ({
  deleteMail: vi.fn(),
  getMailboxFolder: vi.fn(),
  markMailAsRead: vi.fn(),
  sendMail: vi.fn(),
}))

describe('useMailApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem(AUTH_TOKEN_KEY, 'hook-token')
  })

  afterEach(() => {
    cleanup()
  })

  it('sends mail through the service with the stored token', async () => {
    sendMail.mockResolvedValueOnce({ id: 'mail-1' })
    const { result } = renderHook(() => useMailApi())
    const message = {
      senderEmail: 'sender@example.com',
      recipientEmail: 'receiver@example.com',
      subject: 'Hook message',
      bodyHtml: '<p>Hello</p>',
      bodyText: 'Hello',
    }

    await expect(result.current.sendMessage(message)).resolves.toEqual({
      id: 'mail-1',
    })
    expect(sendMail).toHaveBeenCalledWith({
      ...message,
      token: 'hook-token',
    })
  })

  it('loads mailbox folders through the service with authentication', async () => {
    getMailboxFolder.mockResolvedValueOnce([{ id: 'mail-1' }])
    const { result } = renderHook(() => useMailApi())

    await result.current.loadMailboxFolder({
      email: 'person@example.com',
      folder: 'inbox',
    })

    expect(getMailboxFolder).toHaveBeenCalledWith({
      email: 'person@example.com',
      folder: 'inbox',
      token: 'hook-token',
    })
  })

  it('routes read and delete operations through the authenticated service', async () => {
    markMailAsRead.mockResolvedValueOnce({ id: 'mail-1', read: true })
    deleteMail.mockResolvedValueOnce('mail-1')
    const { result } = renderHook(() => useMailApi())
    const message = {
      id: 'mail-1',
      senderEmail: 'sender@example.com',
    }

    await result.current.markMessageAsRead({
      message,
      recipientEmail: 'receiver@example.com',
    })
    await result.current.removeMessage({
      email: 'receiver@example.com',
      folder: 'inbox',
      messageId: 'mail-1',
    })

    expect(markMailAsRead).toHaveBeenCalledWith({
      message,
      recipientEmail: 'receiver@example.com',
      token: 'hook-token',
    })
    expect(deleteMail).toHaveBeenCalledWith({
      email: 'receiver@example.com',
      folder: 'inbox',
      messageId: 'mail-1',
      token: 'hook-token',
    })
  })

  it('keeps API callback references stable across rerenders', () => {
    const { result, rerender } = renderHook(() => useMailApi())
    const firstCallbacks = result.current

    rerender()

    expect(result.current.sendMessage).toBe(firstCallbacks.sendMessage)
    expect(result.current.loadMailboxFolder).toBe(
      firstCallbacks.loadMailboxFolder,
    )
    expect(result.current.markMessageAsRead).toBe(
      firstCallbacks.markMessageAsRead,
    )
    expect(result.current.removeMessage).toBe(firstCallbacks.removeMessage)
  })
})
