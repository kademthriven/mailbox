import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  deleteMail,
  getMailboxFolder,
  markMailAsRead,
  sendMail,
} from './mailService'
import App, { AUTH_EMAIL_KEY, AUTH_TOKEN_KEY } from './App'

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('./firebase', () => ({
  auth: { name: 'test-auth' },
  isFirebaseConfigured: true,
}))

vi.mock('./mailService', () => ({
  deleteMail: vi.fn(),
  getMailboxFolder: vi.fn(),
  isMailDatabaseConfigured: true,
  markMailAsRead: vi.fn(),
  sendMail: vi.fn(),
}))

vi.mock('./RichTextEditor', () => ({
  default: ({ onChange }) => (
    <textarea
      aria-label="Message body"
      onChange={(event) =>
        onChange({
          html: `<p>${event.target.value}</p>`,
          text: event.target.value,
          isEmpty: event.target.value.trim() === '',
        })
      }
    />
  ),
}))

const fillSignupForm = async ({
  email = 'person@example.com',
  password = 'secret123',
  confirmation = password,
} = {}) => {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Email address'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText('Confirm password'), confirmation)

  return user
}

describe('Signup component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the three required signup fields', () => {
    render(<App />)

    const email = screen.getByLabelText('Email address')
    const password = screen.getByLabelText('Password')
    const confirmation = screen.getByLabelText('Confirm password')

    expect(email).toHaveAttribute('type', 'email')
    expect(password).toHaveAttribute('type', 'password')
    expect(confirmation).toHaveAttribute('type', 'password')
    expect(email).toBeRequired()
    expect(password).toBeRequired()
    expect(confirmation).toBeRequired()
  })

  it('keeps the signup button disabled while the form is empty', () => {
    render(<App />)

    expect(
      screen.getByRole('button', { name: /create my account/i }),
    ).toBeDisabled()
  })

  it('keeps submission disabled and marks confirmation invalid when passwords differ', async () => {
    render(<App />)

    await fillSignupForm({ confirmation: 'different123' })

    expect(screen.getByLabelText('Confirm password')).toHaveClass('is-invalid')
    expect(screen.getByText('The passwords must match.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create my account/i }),
    ).toBeDisabled()
  })

  it('enables the signup button when all fields are valid and passwords match', async () => {
    render(<App />)

    await fillSignupForm()

    expect(
      screen.getByRole('button', { name: /create my account/i }),
    ).toBeEnabled()
  })

  it('creates the Firebase user, logs success, and shows the success state', async () => {
    createUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'new-user' },
    })
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    render(<App />)

    const user = await fillSignupForm({ email: '  person@example.com  ' })
    await user.click(
      screen.getByRole('button', { name: /create my account/i }),
    )

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      { name: 'test-auth' },
      'person@example.com',
      'secret123',
    )
    expect(await screen.findByText("You're all set!")).toBeInTheDocument()
    expect(consoleSpy).toHaveBeenCalledWith(
      'User has successfully signed up.',
    )

    consoleSpy.mockRestore()
  })

  it('shows a helpful message when the email already has an account', async () => {
    createUserWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
    })
    render(<App />)

    const user = await fillSignupForm()
    await user.click(
      screen.getByRole('button', { name: /create my account/i }),
    )

    expect(
      await screen.findByText(
        'An account already exists for this email. Try signing in instead.',
      ),
    ).toBeInTheDocument()
  })

  it('rejects an invalid email locally without calling Firebase', async () => {
    render(<App />)

    const user = await fillSignupForm({ email: 'not-an-email' })
    await user.click(
      screen.getByRole('button', { name: /create my account/i }),
    )

    expect(screen.getByLabelText('Email address')).toHaveClass('is-invalid')
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled()
  })
})

describe('Login component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    getMailboxFolder.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  const openLogin = async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    return user
  }

  const fillLoginForm = async (user) => {
    await user.type(screen.getByLabelText('Email address'), 'person@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
  }

  it('renders the required email and password login fields', async () => {
    await openLogin()

    expect(screen.getByLabelText('Email address')).toBeRequired()
    expect(screen.getByLabelText('Password')).toBeRequired()
    expect(
      screen.getByRole('button', { name: /sign in to postly/i }),
    ).toBeDisabled()
  })

  it('alerts the user when Firebase rejects the credentials', async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/invalid-credential',
    })
    const user = await openLogin()
    await fillLoginForm(user)

    await user.click(
      screen.getByRole('button', { name: /sign in to postly/i }),
    )

    expect(
      await screen.findByText(
        'The email or password you entered is incorrect. Please try again.',
      ),
    ).toBeInTheDocument()
  })

  it('stores the Firebase token and opens the received-mail inbox', async () => {
    const getIdToken = vi.fn().mockResolvedValue('firebase-id-token')
    signInWithEmailAndPassword.mockResolvedValueOnce({
      user: {
        email: 'person@example.com',
        getIdToken,
      },
    })
    const user = await openLogin()
    await fillLoginForm(user)

    await user.click(
      screen.getByRole('button', { name: /sign in to postly/i }),
    )

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      { name: 'test-auth' },
      'person@example.com',
      'secret123',
    )
    expect(getIdToken).toHaveBeenCalledOnce()
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('firebase-id-token')
    expect(localStorage.getItem(AUTH_EMAIL_KEY)).toBe('person@example.com')
    expect(
      await screen.findByRole('heading', {
        name: 'Inbox',
      }),
    ).toBeInTheDocument()
    expect(getMailboxFolder).toHaveBeenCalledWith({
      email: 'person@example.com',
      folder: 'inbox',
      token: 'firebase-id-token',
    })
  })

  it('restores the inbox when a stored token is present', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'persisted-token')
    localStorage.setItem(AUTH_EMAIL_KEY, 'returning@example.com')

    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Inbox' }),
    ).toBeInTheDocument()
    expect(screen.getByText('returning@example.com')).toBeInTheDocument()
  })

  it('clears the stored token and returns to login on logout', async () => {
    signOut.mockResolvedValueOnce()
    localStorage.setItem(AUTH_TOKEN_KEY, 'persisted-token')
    localStorage.setItem(AUTH_EMAIL_KEY, 'returning@example.com')
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /log out/i }))

    expect(signOut).toHaveBeenCalledWith({ name: 'test-auth' })
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(AUTH_EMAIL_KEY)).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Sign in to Postly' }),
    ).toBeInTheDocument()
  })
})

describe('Compose mail component', () => {
  const renderMailbox = () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'firebase-id-token')
    localStorage.setItem(AUTH_EMAIL_KEY, 'sender@example.com')
    const user = userEvent.setup()
    render(<App />)
    return user
  }

  const openComposer = async () => {
    const user = renderMailbox()
    await user.click(screen.getByRole('button', { name: /^compose$/i }))
    return user
  }

  const fillMessage = async (user) => {
    await user.type(
      await screen.findByLabelText('Recipient email'),
      'receiver@example.com',
    )
    await user.type(screen.getByLabelText('Subject'), 'Project update')
    await user.type(
      await screen.findByLabelText('Message body'),
      'The launch is going well.',
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    getMailboxFolder.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('opens a composer with required recipient, subject, and body fields', async () => {
    await openComposer()

    expect(screen.getByLabelText('Recipient email')).toBeRequired()
    expect(screen.getByLabelText('Subject')).toBeRequired()
    expect(await screen.findByLabelText('Message body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled()
  })

  it('sends the rich message with the authenticated sender and token', async () => {
    sendMail.mockResolvedValueOnce({
      id: 'message-1',
      senderEmail: 'sender@example.com',
      recipientEmail: 'receiver@example.com',
      subject: 'Project update',
      bodyText: 'The launch is going well.',
      createdAt: Date.now(),
    })
    const user = await openComposer()
    await fillMessage(user)

    await user.click(screen.getByRole('button', { name: /^send$/i }))

    expect(sendMail).toHaveBeenCalledWith({
      senderEmail: 'sender@example.com',
      recipientEmail: 'receiver@example.com',
      subject: 'Project update',
      bodyHtml: '<p>The launch is going well.</p>',
      bodyText: 'The launch is going well.',
      token: 'firebase-id-token',
    })
    expect(
      await screen.findByText(
        'Your message to receiver@example.com was sent.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the Firebase error when sending fails', async () => {
    sendMail.mockRejectedValueOnce(new Error('Permission denied'))
    const user = await openComposer()
    await fillMessage(user)

    await user.click(screen.getByRole('button', { name: /^send$/i }))

    expect(await screen.findByText('Permission denied')).toBeInTheDocument()
  })

  it('retrieves inbox mail for the authenticated email address', async () => {
    getMailboxFolder.mockResolvedValueOnce([
      {
        id: 'message-2',
        senderEmail: 'friend@example.com',
        recipientEmail: 'sender@example.com',
        subject: 'Hello from your inbox',
        bodyText: 'A saved Firebase message.',
        createdAt: Date.now(),
      },
    ])
    renderMailbox()

    expect(
      await screen.findByText('Hello from your inbox'),
    ).toBeInTheDocument()
    expect(getMailboxFolder).toHaveBeenCalledWith({
      email: 'sender@example.com',
      folder: 'inbox',
      token: 'firebase-id-token',
    })
  })

  it('closes and discards the compose screen without sending', async () => {
    const user = await openComposer()

    await user.click(screen.getByRole('button', { name: 'Discard draft' }))

    expect(sendMail).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', { name: 'Inbox' }),
    ).toBeInTheDocument()
  })
})

describe('Inbox component', () => {
  const inboxMessage = (overrides = {}) => ({
    id: 'inbox-message-1',
    senderEmail: 'friend@example.com',
    recipientEmail: 'receiver@example.com',
    subject: 'Inbox test message',
    bodyText: 'This message came from Firebase.',
    createdAt: Date.now(),
    read: false,
    ...overrides,
  })

  const renderInbox = () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'firebase-id-token')
    localStorage.setItem(AUTH_EMAIL_KEY, 'receiver@example.com')
    const user = userEvent.setup()
    render(<App />)
    return user
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    markMailAsRead.mockResolvedValue({})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('gets and displays mail sent to the authenticated user', async () => {
    getMailboxFolder.mockResolvedValueOnce([inboxMessage()])

    renderInbox()

    expect(
      await screen.findByText('Inbox test message'),
    ).toBeInTheDocument()
    expect(screen.getByText('friend@example.com')).toBeInTheDocument()
    expect(screen.getByText('This message came from Firebase.')).toBeInTheDocument()
    expect(getMailboxFolder).toHaveBeenCalledWith({
      email: 'receiver@example.com',
      folder: 'inbox',
      token: 'firebase-id-token',
    })
  })

  it('shows a loading state while the Firebase GET is pending', async () => {
    getMailboxFolder.mockReturnValueOnce(new Promise(() => {}))

    renderInbox()

    expect(
      await screen.findByText('Loading your messages…'),
    ).toBeInTheDocument()
  })

  it('shows an empty inbox when Firebase returns no messages', async () => {
    getMailboxFolder.mockResolvedValueOnce([])

    renderInbox()

    expect(await screen.findByText('No messages here yet')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Messages sent to this email address will appear here.',
      ),
    ).toBeInTheDocument()
  })

  it('shows a user-facing error when the inbox GET fails', async () => {
    getMailboxFolder.mockRejectedValueOnce(
      new Error('Firebase inbox is unavailable.'),
    )

    renderInbox()

    expect(
      await screen.findByText('Firebase inbox is unavailable.'),
    ).toBeInTheDocument()
  })

  it('filters received messages using the mailbox search field', async () => {
    getMailboxFolder.mockResolvedValueOnce([
      inboxMessage(),
      inboxMessage({
        id: 'inbox-message-2',
        senderEmail: 'team@example.com',
        subject: 'Quarterly planning',
        bodyText: 'Please review the planning notes.',
      }),
    ])
    const user = renderInbox()

    expect(await screen.findByText('Inbox test message')).toBeInTheDocument()
    expect(screen.getByText('Quarterly planning')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search mail'), 'quarterly')

    expect(screen.queryByText('Inbox test message')).not.toBeInTheDocument()
    expect(screen.getByText('Quarterly planning')).toBeInTheDocument()
  })

  it('refreshes the inbox with a new Firebase GET request', async () => {
    getMailboxFolder
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        inboxMessage({ subject: 'Newly received message' }),
      ])
    const user = renderInbox()

    expect(await screen.findByText('No messages here yet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Refresh Inbox' }))

    expect(
      await screen.findByText('Newly received message'),
    ).toBeInTheDocument()
    expect(getMailboxFolder).toHaveBeenCalledTimes(2)
  })

  it('shows a blue unread marker per new mail and the total in the sidebar', async () => {
    getMailboxFolder.mockResolvedValueOnce([
      inboxMessage(),
      inboxMessage({ id: 'inbox-message-2', subject: 'Second unread mail' }),
      inboxMessage({
        id: 'inbox-message-3',
        subject: 'Previously read mail',
        read: true,
      }),
    ])

    renderInbox()

    expect(await screen.findByText('Second unread mail')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Unread message')).toHaveLength(2)
    expect(screen.getByTestId('inbox-unread-count')).toHaveTextContent('2')
    expect(screen.getByTestId('inbox-unread-count')).toHaveAccessibleName(
      '2 unread messages',
    )
  })

  it('opens the complete message and persists its read status in Firebase', async () => {
    const message = inboxMessage({
      bodyText:
        'This is the complete first line.\nThis second line must also be visible.',
    })
    getMailboxFolder.mockResolvedValueOnce([message])
    const user = renderInbox()

    await user.click(
      await screen.findByRole('button', {
        name: 'Open message: Inbox test message',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Inbox test message' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'This is the complete first line. This second line must also be visible.',
      ),
    ).toBeInTheDocument()
    expect(markMailAsRead).toHaveBeenCalledWith({
      message,
      recipientEmail: 'receiver@example.com',
      token: 'firebase-id-token',
    })
  })

  it('removes the unread marker and decreases the count after opening mail', async () => {
    getMailboxFolder.mockResolvedValueOnce([inboxMessage()])
    const user = renderInbox()

    await user.click(
      await screen.findByRole('button', {
        name: 'Open message: Inbox test message',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Back to Inbox' }))

    expect(screen.queryByLabelText('Unread message')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Read message')).toBeInTheDocument()
    expect(screen.getByTestId('inbox-unread-count')).toHaveTextContent('0')
  })

  it('does not update Firebase again when an already-read message is opened', async () => {
    getMailboxFolder.mockResolvedValueOnce([
      inboxMessage({ read: true, subject: 'Already read' }),
    ])
    const user = renderInbox()

    await user.click(
      await screen.findByRole('button', {
        name: 'Open message: Already read',
      }),
    )

    expect(markMailAsRead).not.toHaveBeenCalled()
    expect(screen.getByTestId('inbox-unread-count')).toHaveTextContent('0')
  })

  it('restores unread state and alerts the user when saving read status fails', async () => {
    getMailboxFolder.mockResolvedValueOnce([inboxMessage()])
    markMailAsRead.mockRejectedValueOnce(
      new Error('Firebase could not save the read status.'),
    )
    const user = renderInbox()

    await user.click(
      await screen.findByRole('button', {
        name: 'Open message: Inbox test message',
      }),
    )

    expect(
      await screen.findByText('Firebase could not save the read status.'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('inbox-unread-count')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: 'Back to Inbox' }))
    expect(screen.getByLabelText('Unread message')).toBeInTheDocument()
  })

  it('does not show a blue dot when every inbox message is already read', async () => {
    getMailboxFolder.mockResolvedValueOnce([
      inboxMessage({ read: true }),
      inboxMessage({
        id: 'inbox-message-2',
        subject: 'Another read message',
        read: true,
      }),
    ])

    renderInbox()

    expect(await screen.findByText('Another read message')).toBeInTheDocument()
    expect(screen.queryByLabelText('Unread message')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('Read message')).toHaveLength(2)
    expect(screen.getByTestId('inbox-unread-count')).toHaveTextContent('0')
  })

  it('keeps the total unread count when search hides unread rows', async () => {
    getMailboxFolder.mockResolvedValueOnce([
      inboxMessage(),
      inboxMessage({
        id: 'inbox-message-2',
        senderEmail: 'updates@example.com',
        subject: 'Product update',
      }),
    ])
    const user = renderInbox()

    expect(await screen.findByText('Product update')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search mail'), 'product')

    expect(screen.getAllByLabelText('Unread message')).toHaveLength(1)
    expect(screen.getByTestId('inbox-unread-count')).toHaveTextContent('2')
  })

  it('keeps the blue dot removed after refreshing mail marked read in Firebase', async () => {
    const unreadMessage = inboxMessage()
    getMailboxFolder
      .mockResolvedValueOnce([unreadMessage])
      .mockResolvedValueOnce([{ ...unreadMessage, read: true }])
    const user = renderInbox()

    await user.click(
      await screen.findByRole('button', {
        name: 'Open message: Inbox test message',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Back to Inbox' }))
    await user.click(screen.getByRole('button', { name: 'Refresh Inbox' }))

    await waitFor(() => expect(getMailboxFolder).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByRole('button', {
        name: 'Open message: Inbox test message',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Unread message')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Read message')).toBeInTheDocument()
    expect(screen.getByTestId('inbox-unread-count')).toHaveTextContent('0')
  })
})

describe('Reading message component', () => {
  const message = (overrides = {}) => ({
    id: 'reading-message-1',
    senderEmail: 'author@example.com',
    recipientEmail: 'reader@example.com',
    subject: 'A complete message',
    bodyText: 'First paragraph.\n\nSecond paragraph with the full conclusion.',
    createdAt: Date.now(),
    read: false,
    ...overrides,
  })

  const renderReaderInbox = (mail = message()) => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'reading-token')
    localStorage.setItem(AUTH_EMAIL_KEY, 'reader@example.com')
    getMailboxFolder.mockResolvedValueOnce([mail])
    markMailAsRead.mockResolvedValue({})
    const user = userEvent.setup()
    const view = render(<App />)

    return { mail, user, ...view }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows the complete subject, sender, recipient, and message body', async () => {
    const { user } = renderReaderInbox()

    await user.click(
      await screen.findByRole('button', {
        name: 'Open message: A complete message',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'A complete message' }),
    ).toBeInTheDocument()
    expect(screen.getByText('author@example.com')).toBeInTheDocument()
    expect(screen.getByText('To reader@example.com')).toBeInTheDocument()
    expect(
      screen.getByText(
        'First paragraph. Second paragraph with the full conclusion.',
      ),
    ).toBeInTheDocument()
  })

  it('returns to the inbox list when the back button is clicked', async () => {
    const { user } = renderReaderInbox(message({ read: true }))

    await user.click(
      await screen.findByRole('button', {
        name: 'Open message: A complete message',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Back to Inbox' }))

    expect(
      screen.getByRole('heading', { name: 'Inbox' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Open message: A complete message',
      }),
    ).toBeInTheDocument()
  })

  it('supports opening a message with the keyboard', async () => {
    const { user } = renderReaderInbox(message({ read: true }))
    const row = await screen.findByRole('button', {
      name: 'Open message: A complete message',
    })

    row.focus()
    await user.keyboard('{Enter}')

    expect(
      screen.getByRole('heading', { name: 'A complete message' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to Inbox' })).toBeVisible()
  })
})

describe('Delete mail component', () => {
  const mailboxMessage = (overrides = {}) => ({
    id: 'delete-message-1',
    senderEmail: 'sender@example.com',
    recipientEmail: 'owner@example.com',
    subject: 'Delete this message',
    bodyText: 'This message can be removed.',
    createdAt: Date.now(),
    read: false,
    ...overrides,
  })

  const renderMailbox = () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'delete-token')
    localStorage.setItem(AUTH_EMAIL_KEY, 'owner@example.com')
    const user = userEvent.setup()
    render(<App />)
    return user
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    deleteMail.mockResolvedValue('delete-message-1')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('deletes an inbox message and removes it from the visible list', async () => {
    getMailboxFolder.mockResolvedValueOnce([
      mailboxMessage(),
      mailboxMessage({
        id: 'keep-message',
        subject: 'Keep this message',
      }),
    ])
    const user = renderMailbox()

    await user.click(
      await screen.findByRole('button', {
        name: 'Delete message: Delete this message',
      }),
    )

    await waitFor(() =>
      expect(screen.queryByText('Delete this message')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Keep this message')).toBeInTheDocument()
    expect(screen.getByTestId('inbox-unread-count')).toHaveTextContent('1')
    expect(deleteMail).toHaveBeenCalledWith({
      email: 'owner@example.com',
      folder: 'inbox',
      messageId: 'delete-message-1',
      token: 'delete-token',
    })
    expect(markMailAsRead).not.toHaveBeenCalled()
  })

  it('keeps the message visible and shows an error when deletion fails', async () => {
    getMailboxFolder.mockResolvedValueOnce([mailboxMessage()])
    deleteMail.mockRejectedValueOnce(new Error('Firebase deletion failed.'))
    const user = renderMailbox()

    await user.click(
      await screen.findByRole('button', {
        name: 'Delete message: Delete this message',
      }),
    )

    expect(
      await screen.findByText('Firebase deletion failed.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Delete this message')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Delete message: Delete this message',
      }),
    ).toBeEnabled()
  })

  it('deletes only the authenticated user sent-mail copy from Sent', async () => {
    getMailboxFolder
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        mailboxMessage({
          recipientEmail: 'recipient@example.com',
          read: true,
        }),
      ])
    const user = renderMailbox()

    expect(await screen.findByText('No messages here yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sent' }))
    await user.click(
      await screen.findByRole('button', {
        name: 'Delete message: Delete this message',
      }),
    )

    expect(
      await screen.findByText('No messages here yet'),
    ).toBeInTheDocument()
    expect(deleteMail).toHaveBeenCalledWith({
      email: 'owner@example.com',
      folder: 'sent',
      messageId: 'delete-message-1',
      token: 'delete-token',
    })
  })

  it('disables the row delete button while Firebase deletion is pending', async () => {
    getMailboxFolder.mockResolvedValueOnce([mailboxMessage()])
    deleteMail.mockReturnValueOnce(new Promise(() => {}))
    const user = renderMailbox()
    const deleteButton = await screen.findByRole('button', {
      name: 'Delete message: Delete this message',
    })

    await user.click(deleteButton)

    expect(deleteButton).toBeDisabled()
    expect(screen.getByText('Delete this message')).toBeInTheDocument()
    expect(deleteMail).toHaveBeenCalledOnce()
  })

  it('does not reduce the unread total when deleting a read message', async () => {
    getMailboxFolder.mockResolvedValueOnce([
      mailboxMessage({
        id: 'unread-message',
        subject: 'Keep unread message',
      }),
      mailboxMessage({ read: true }),
    ])
    const user = renderMailbox()

    expect(await screen.findByText('Keep unread message')).toBeInTheDocument()
    expect(screen.getByTestId('inbox-unread-count')).toHaveTextContent('1')
    await user.click(
      screen.getByRole('button', {
        name: 'Delete message: Delete this message',
      }),
    )

    await waitFor(() =>
      expect(screen.queryByText('Delete this message')).not.toBeInTheDocument(),
    )
    expect(screen.getByTestId('inbox-unread-count')).toHaveTextContent('1')
    expect(screen.getAllByLabelText('Unread message')).toHaveLength(1)
  })
})
