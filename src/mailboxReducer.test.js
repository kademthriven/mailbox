import { describe, expect, it } from 'vitest'
import { initialMailboxState, mailboxReducer } from './mailboxReducer'

const message = (overrides = {}) => ({
  id: 'message-1',
  senderEmail: 'sender@example.com',
  recipientEmail: 'receiver@example.com',
  subject: 'Polling update',
  bodyHtml: '<p>Polling update body</p>',
  bodyText: 'Polling update body',
  createdAt: 100,
  read: false,
  ...overrides,
})

describe('Mailbox polling reducer', () => {
  it('adds newly polled Inbox messages and recalculates unread mail', () => {
    const nextState = mailboxReducer(initialMailboxState, {
      type: 'inbox/pollSucceeded',
      messages: [message(), message({ id: 'message-2', read: true })],
    })

    expect(nextState.messages).toHaveLength(2)
    expect(nextState.unreadCount).toBe(1)
  })

  it('returns the same state reference when a poll contains no changes', () => {
    const existingMessage = message()
    const state = {
      ...initialMailboxState,
      messages: [existingMessage],
      unreadCount: 1,
      loadingMessages: false,
    }

    const nextState = mailboxReducer(state, {
      type: 'inbox/pollSucceeded',
      messages: [{ ...existingMessage }],
    })

    expect(nextState).toBe(state)
    expect(nextState.messages[0]).toBe(existingMessage)
  })

  it('updates only the unread count while another folder is active', () => {
    const sentMessages = [
      message({
        id: 'sent-message',
        senderEmail: 'receiver@example.com',
        recipientEmail: 'friend@example.com',
      }),
    ]
    const state = {
      ...initialMailboxState,
      activeFolder: 'sent',
      messages: sentMessages,
      loadingMessages: false,
    }

    const nextState = mailboxReducer(state, {
      type: 'inbox/pollSucceeded',
      messages: [message()],
    })

    expect(nextState.messages).toBe(sentMessages)
    expect(nextState.unreadCount).toBe(1)
  })

  it('preserves optimistic read status while Firebase update is pending', () => {
    const state = {
      ...initialMailboxState,
      messages: [message({ read: true })],
      unreadCount: 0,
      markingReadMessageIds: ['message-1'],
      loadingMessages: false,
    }

    const nextState = mailboxReducer(state, {
      type: 'inbox/pollSucceeded',
      messages: [message({ read: false })],
    })

    expect(nextState.messages[0].read).toBe(true)
    expect(nextState.unreadCount).toBe(0)
  })
})
