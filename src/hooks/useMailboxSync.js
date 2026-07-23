import { useEffect } from 'react'
import { MAILBOX_POLL_INTERVAL_MS } from '../storageKeys'
import { useMailApi } from './useMailApi'

export function useMailboxFolder({
  email,
  folder,
  refreshKey,
  onSuccess,
  onError,
}) {
  const { loadMailboxFolder } = useMailApi()

  useEffect(() => {
    if (!['inbox', 'sent'].includes(folder)) {
      return undefined
    }

    let cancelled = false

    const loadFolder = async () => {
      try {
        const messages = await loadMailboxFolder({ email, folder })

        if (!cancelled) {
          onSuccess(folder, messages)
        }
      } catch (error) {
        if (!cancelled) {
          onError(folder, error)
        }
      }
    }

    const loadTimer = window.setTimeout(loadFolder, 0)

    return () => {
      cancelled = true
      window.clearTimeout(loadTimer)
    }
  }, [
    email,
    folder,
    loadMailboxFolder,
    onError,
    onSuccess,
    refreshKey,
  ])
}

export function useInboxPolling({ email, onMessages }) {
  const { loadMailboxFolder } = useMailApi()

  useEffect(() => {
    let cancelled = false
    let requestInFlight = false

    const pollInbox = async () => {
      if (requestInFlight) {
        return
      }

      requestInFlight = true

      try {
        const inboxMessages = await loadMailboxFolder({
          email,
          folder: 'inbox',
        })

        if (!cancelled) {
          onMessages(inboxMessages)
        }
      } catch {
        // Keep the last successful Inbox data visible during a transient poll failure.
      } finally {
        requestInFlight = false
      }
    }

    const pollTimer = window.setInterval(
      pollInbox,
      MAILBOX_POLL_INTERVAL_MS,
    )

    return () => {
      cancelled = true
      window.clearInterval(pollTimer)
    }
  }, [email, loadMailboxFolder, onMessages])
}
