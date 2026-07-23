import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { getMailboxFolder, sendMail } from './mailService'
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
  getMailboxFolder: vi.fn(),
  isMailDatabaseConfigured: true,
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
