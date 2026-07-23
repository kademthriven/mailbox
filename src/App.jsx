import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from 'react'
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  ListGroup,
  Nav,
  Navbar,
  Row,
  Spinner,
  Stack,
} from 'react-bootstrap'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './firebase'
import {
  getMailboxFolder,
  isMailDatabaseConfigured,
  markMailAsRead,
  sendMail,
} from './mailService'
import { initialMailboxState, mailboxReducer } from './mailboxReducer'
import './App.css'

const RichTextEditor = lazy(() => import('./RichTextEditor'))

export const AUTH_TOKEN_KEY = 'postlyAuthToken'
export const AUTH_EMAIL_KEY = 'postlyUserEmail'

const signupErrorMessages = {
  'auth/email-already-in-use':
    'An account already exists for this email. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
  'auth/operation-not-allowed':
    'Email sign-up is not enabled yet. Please contact support.',
  'auth/network-request-failed':
    'We could not reach the server. Check your connection and try again.',
  'auth/too-many-requests':
    'Too many attempts were made. Please wait a moment and try again.',
}

const loginErrorMessages = {
  'auth/invalid-credential':
    'The email or password you entered is incorrect. Please try again.',
  'auth/wrong-password':
    'The email or password you entered is incorrect. Please try again.',
  'auth/user-not-found':
    'The email or password you entered is incorrect. Please try again.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled':
    'This account has been disabled. Please contact support for help.',
  'auth/network-request-failed':
    'We could not reach the server. Check your connection and try again.',
  'auth/too-many-requests':
    'Too many unsuccessful attempts were made. Please wait and try again.',
}

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

function Brand({ onClick }) {
  return (
    <Navbar.Brand as="button" type="button" onClick={onClick} className="brand-mark">
      <span className="brand-icon" aria-hidden="true">
        <i className="bi bi-envelope-paper-heart-fill" />
      </span>
      <span>Postly</span>
    </Navbar.Brand>
  )
}

function SiteNavbar({ screen, onLogin, onSignup }) {
  return (
    <Navbar expand="md" className="site-navbar" aria-label="Primary navigation">
      <Container>
        <Brand onClick={onSignup} />

        <Navbar.Toggle aria-controls="main-navigation" />
        <Navbar.Collapse id="main-navigation">
          <Nav className="ms-auto align-items-md-center">
            <Nav.Link href="#features">Features</Nav.Link>
            <Nav.Link href="#security">Security</Nav.Link>
            {screen === 'signup' ? (
              <Button
                variant="outline-primary"
                className="nav-signin ms-md-3"
                onClick={onLogin}
              >
                Sign in
              </Button>
            ) : (
              <Button
                variant="outline-primary"
                className="nav-signin ms-md-3"
                onClick={onSignup}
              >
                Create account
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

function AuthIntro({ screen }) {
  const isLogin = screen === 'login'

  return (
    <Col lg={6} className="intro-column">
      <Badge pill bg="light" text="primary" className="eyebrow">
        <i className={`bi ${isLogin ? 'bi-envelope-open-heart' : 'bi-stars'} me-2`} />
        {isLogin ? 'Your inbox is waiting' : 'Your inbox, reimagined'}
      </Badge>

      <h1 className="hero-title">
        {isLogin
          ? 'Good to see you again.'
          : 'Join the calmer way to handle your mail.'}
      </h1>
      <p className="hero-copy">
        {isLogin
          ? 'Sign in to pick up where you left off. Every important conversation is still right where it belongs.'
          : 'One thoughtfully organized inbox for every conversation that matters. Create your free account in less than a minute.'}
      </p>

      <Stack direction="horizontal" gap={4} className="trust-row flex-wrap">
        <span>
          <i className="bi bi-shield-check" /> Private by design
        </span>
        <span>
          <i className="bi bi-lightning-charge" /> Quick access
        </span>
      </Stack>

      <div className="mail-illustration" aria-hidden="true">
        <div className="floating-mail mail-one">
          <i className="bi bi-envelope-fill" />
        </div>
        <div className="floating-mail mail-two">
          <i className="bi bi-envelope-heart-fill" />
        </div>
        <div className="mailbox">
          <div className="mailbox-slot" />
          <i className="bi bi-envelope-paper-fill mailbox-letter" />
          <div className="mailbox-post" />
        </div>
      </div>
    </Col>
  )
}

function SignupCard({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const allFieldsFilled =
    email.trim() !== '' && password !== '' && confirmPassword !== ''
  const emailIsValid = isValidEmail(email)
  const passwordsMatch = password === confirmPassword
  const canSubmit = allFieldsFilled && passwordsMatch && !loading && !success

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    setError('')

    if (!event.currentTarget.checkValidity()) {
      return
    }

    if (!passwordsMatch) {
      setError('Your passwords do not match. Please try again.')
      return
    }

    if (!isFirebaseConfigured || !auth) {
      setError(
        'Authentication is not configured yet. Add your Firebase settings to the environment file and try again.',
      )
      return
    }

    setLoading(true)

    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password)
      console.log('User has successfully signed up.')
      setSuccess(true)
    } catch (firebaseError) {
      setError(
        signupErrorMessages[firebaseError.code] ||
          'We could not create your account. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="signup-card auth-card border-0">
      <Card.Body>
        <div className="card-heading">
          <span className="welcome-icon" aria-hidden="true">
            <i className="bi bi-person-plus-fill" />
          </span>
          <div>
            <p className="card-kicker">Welcome to Postly</p>
            <h2>Create your account</h2>
          </div>
        </div>

        <p className="card-subtitle">
          Start organizing your inbox today. It&apos;s free.
        </p>

        {error && (
          <Alert variant="danger" className="form-alert" role="alert">
            <i className="bi bi-exclamation-circle-fill" />
            <span>{error}</span>
          </Alert>
        )}

        {success ? (
          <div className="success-panel" role="status">
            <div className="success-icon" aria-hidden="true">
              <i className="bi bi-check-lg" />
            </div>
            <h3>You&apos;re all set!</h3>
            <p>
              Your account has been created successfully. You can now sign in
              whenever you&apos;re ready.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-100 rounded-pill"
              onClick={onLogin}
            >
              Continue to sign in
              <i className="bi bi-arrow-right ms-2" />
            </Button>
          </div>
        ) : (
          <Form noValidate onSubmit={handleSubmit}>
            <Form.Group className="form-field" controlId="signupEmail">
              <Form.Label>Email address</Form.Label>
              <InputGroup hasValidation>
                <InputGroup.Text>
                  <i className="bi bi-envelope" />
                </InputGroup.Text>
                <Form.Control
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  isInvalid={submitted && !emailIsValid}
                  required
                  autoComplete="email"
                />
                <Form.Control.Feedback type="invalid">
                  {email.trim()
                    ? 'Enter a valid email address.'
                    : 'Enter your email address.'}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <Form.Group className="form-field" controlId="signupPassword">
              <div className="d-flex justify-content-between">
                <Form.Label>Password</Form.Label>
                <span className="field-hint">6+ characters</span>
              </div>
              <InputGroup hasValidation>
                <InputGroup.Text>
                  <i className="bi bi-lock" />
                </InputGroup.Text>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  isInvalid={
                    submitted && (password.length === 0 || password.length < 6)
                  }
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
                <Button
                  variant="outline-secondary"
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                </Button>
                <Form.Control.Feedback type="invalid">
                  Use at least 6 characters.
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <Form.Group className="form-field" controlId="confirmPassword">
              <Form.Label>Confirm password</Form.Label>
              <InputGroup hasValidation>
                <InputGroup.Text>
                  <i className="bi bi-shield-lock" />
                </InputGroup.Text>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter it once more"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  isInvalid={
                    (confirmPassword !== '' && !passwordsMatch) ||
                    (submitted && !confirmPassword)
                  }
                  required
                  autoComplete="new-password"
                />
                <Form.Control.Feedback type="invalid">
                  {confirmPassword
                    ? 'The passwords must match.'
                    : 'Please confirm your password.'}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              className="signup-button w-100 rounded-pill"
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                    aria-hidden="true"
                  />
                  Creating your account...
                </>
              ) : (
                <>
                  Create my account
                  <i className="bi bi-arrow-right ms-2" />
                </>
              )}
            </Button>
          </Form>
        )}

        {!success && (
          <p className="signin-copy">
            Already have an account?{' '}
            <button type="button" className="inline-link" onClick={onLogin}>
              Sign in here
            </button>
          </p>
        )}
      </Card.Body>
    </Card>
  )
}

function LoginCard({ onSignup, onAuthenticated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const allFieldsFilled = email.trim() !== '' && password !== ''
  const emailIsValid = isValidEmail(email)
  const canSubmit = allFieldsFilled && !loading

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    setError('')

    if (!event.currentTarget.checkValidity()) {
      return
    }

    if (!isFirebaseConfigured || !auth) {
      setError(
        'Authentication is not configured yet. Add your Firebase settings to the environment file and try again.',
      )
      return
    }

    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      )
      const token = await userCredential.user.getIdToken()
      const authenticatedEmail = userCredential.user.email || email.trim()

      localStorage.setItem(AUTH_TOKEN_KEY, token)
      localStorage.setItem(AUTH_EMAIL_KEY, authenticatedEmail)
      onAuthenticated(authenticatedEmail)
    } catch (firebaseError) {
      setError(
        loginErrorMessages[firebaseError.code] ||
          'We could not sign you in. Please check your details and try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="signup-card auth-card login-card border-0">
      <Card.Body>
        <div className="card-heading">
          <span className="welcome-icon login-icon" aria-hidden="true">
            <i className="bi bi-door-open-fill" />
          </span>
          <div>
            <p className="card-kicker">Welcome back</p>
            <h2>Sign in to Postly</h2>
          </div>
        </div>

        <p className="card-subtitle">
          Enter your details to open your mailbox.
        </p>

        {error && (
          <Alert variant="danger" className="form-alert" role="alert">
            <i className="bi bi-exclamation-circle-fill" />
            <span>{error}</span>
          </Alert>
        )}

        <Form noValidate onSubmit={handleSubmit}>
          <Form.Group className="form-field" controlId="loginEmail">
            <Form.Label>Email address</Form.Label>
            <InputGroup hasValidation>
              <InputGroup.Text>
                <i className="bi bi-envelope" />
              </InputGroup.Text>
              <Form.Control
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                isInvalid={submitted && !emailIsValid}
                required
                autoComplete="email"
              />
              <Form.Control.Feedback type="invalid">
                {email.trim()
                  ? 'Enter a valid email address.'
                  : 'Enter your email address.'}
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>

          <Form.Group className="form-field" controlId="loginPassword">
            <div className="d-flex justify-content-between">
              <Form.Label>Password</Form.Label>
              <a href="#forgot-password" className="field-action">
                Forgot password?
              </a>
            </div>
            <InputGroup hasValidation>
              <InputGroup.Text>
                <i className="bi bi-lock" />
              </InputGroup.Text>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                isInvalid={submitted && !password}
                required
                autoComplete="current-password"
              />
              <Button
                variant="outline-secondary"
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
              </Button>
              <Form.Control.Feedback type="invalid">
                Enter your password.
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>

          <Button
            variant="primary"
            size="lg"
            type="submit"
            className="signup-button w-100 rounded-pill"
            disabled={!canSubmit}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  className="me-2"
                  aria-hidden="true"
                />
                Signing you in...
              </>
            ) : (
              <>
                Sign in to Postly
                <i className="bi bi-arrow-right ms-2" />
              </>
            )}
          </Button>
        </Form>

        <p className="signin-copy">
          Don&apos;t have an account?{' '}
          <button type="button" className="inline-link" onClick={onSignup}>
            Create one now
          </button>
        </p>
      </Card.Body>
    </Card>
  )
}

const formatMailDate = (timestamp) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)

function ComposeMail({ senderEmail, onClose, onSent }) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [messageBody, setMessageBody] = useState({
    html: '',
    text: '',
    isEmpty: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const recipientIsValid = isValidEmail(recipientEmail)
  const canSend =
    recipientIsValid &&
    subject.trim() !== '' &&
    !messageBody.isEmpty &&
    !loading

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!canSend) {
      setError('Add a valid recipient, a subject, and a message before sending.')
      return
    }

    setLoading(true)

    try {
      const message = await sendMail({
        senderEmail,
        recipientEmail,
        subject,
        bodyHtml: messageBody.html,
        bodyText: messageBody.text,
        token: localStorage.getItem(AUTH_TOKEN_KEY),
      })
      onSent(message)
    } catch (mailError) {
      setError(
        mailError.message ||
          'We could not send your message. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="compose-card border-0">
      <Card.Header className="compose-card-header">
        <div>
          <span className="compose-kicker">Compose</span>
          <h1>New message</h1>
        </div>
        <Button
          type="button"
          variant="light"
          className="compose-close"
          aria-label="Close composer"
          onClick={onClose}
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </Button>
      </Card.Header>

      <Form onSubmit={handleSubmit} className="compose-form">
        {error && (
          <Alert variant="danger" className="compose-alert" role="alert">
            <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
            <span>{error}</span>
          </Alert>
        )}

        {!isMailDatabaseConfigured && (
          <Alert variant="warning" className="compose-alert">
            Add your Firebase Realtime Database URL to <code>.env</code> before
            sending.
          </Alert>
        )}

        <Form.Group className="compose-row" controlId="composeRecipient">
          <Form.Label>To</Form.Label>
          <div className="recipient-field">
            <span className="recipient-avatar" aria-hidden="true">
              <i className="bi bi-person-fill" />
            </span>
            <Form.Control
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              required
              autoFocus
              aria-label="Recipient email"
            />
          </div>
          <span className="compose-copy-options">Cc / Bcc</span>
        </Form.Group>

        <Form.Group className="compose-row subject-row" controlId="composeSubject">
          <Form.Label className="visually-hidden">Subject</Form.Label>
          <Form.Control
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            aria-label="Subject"
          />
        </Form.Group>

        <Suspense
          fallback={
            <div className="compose-editor-loading">Opening editor…</div>
          }
        >
          <RichTextEditor onChange={setMessageBody} />
        </Suspense>

        <div className="compose-actions">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="compose-send"
            disabled={!canSend}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" aria-hidden="true" />
                Sending…
              </>
            ) : (
              <>
                Send
                <i className="bi bi-send-fill ms-2" aria-hidden="true" />
              </>
            )}
          </Button>
          <span className="compose-from">
            From <strong>{senderEmail}</strong>
          </span>
          <Button
            type="button"
            variant="link"
            className="compose-discard"
            aria-label="Discard draft"
            onClick={onClose}
          >
            <i className="bi bi-trash3" aria-hidden="true" />
          </Button>
        </div>
      </Form>
    </Card>
  )
}

function MailFolder({
  folder,
  messages,
  loading,
  error,
  onRefresh,
  onOpenMessage,
}) {
  const title = folder === 'inbox' ? 'Inbox' : 'Sent'

  return (
    <Card className="mail-list-card border-0">
      <Card.Header>
        <div>
          <p>Your mail</p>
          <h1>{title}</h1>
        </div>
        <Stack direction="horizontal" gap={3}>
          <Badge pill bg="light" text="primary">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </Badge>
          <Button
            type="button"
            variant="light"
            className="refresh-mail-button"
            aria-label={`Refresh ${title}`}
            title={`Refresh ${title}`}
            onClick={onRefresh}
            disabled={loading}
          >
            <i
              className={`bi bi-arrow-clockwise ${loading ? 'spin-icon' : ''}`}
              aria-hidden="true"
            />
          </Button>
        </Stack>
      </Card.Header>

      {error && (
        <Alert variant="danger" className="m-3" role="alert">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="mail-list-state">
          <Spinner animation="border" variant="primary" />
          <span>Loading your messages…</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="mail-list-state">
          <span className="empty-mail-icon">
            <i className={`bi ${folder === 'inbox' ? 'bi-inbox' : 'bi-send'}`} />
          </span>
          <h2>No messages here yet</h2>
          <p>
            {folder === 'inbox'
              ? 'Messages sent to this email address will appear here.'
              : 'Messages you send will be saved here.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mail-list-toolbar" aria-label={`${title} actions`}>
            <Form.Check
              type="checkbox"
              aria-label={`Select all ${title.toLowerCase()} messages`}
            />
            <ButtonGroup aria-label="Mailbox actions">
              <Button type="button" variant="link" disabled>
                <i className="bi bi-archive me-2" aria-hidden="true" />
                Archive
              </Button>
              <Button type="button" variant="link" disabled>
                <i className="bi bi-trash3 me-2" aria-hidden="true" />
                Delete
              </Button>
            </ButtonGroup>
            <span className="mail-sort-label">
              Newest first <i className="bi bi-chevron-down" />
            </span>
          </div>

          <ListGroup variant="flush" className="mail-list">
            {messages.map((message) => {
              const correspondent =
                folder === 'inbox'
                  ? message.senderEmail
                  : `To: ${message.recipientEmail}`

              return (
                <ListGroup.Item
                  key={message.id}
                  className={`mail-list-item ${
                    folder === 'inbox' && !message.read ? 'is-unread' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open message: ${message.subject}`}
                  onClick={() => onOpenMessage(message)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenMessage(message)
                    }
                  }}
                >
                  <Form.Check
                    type="checkbox"
                    className="mail-row-selector"
                    aria-label={`Select message from ${correspondent}`}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span
                    className={`unread-dot ${
                      folder !== 'inbox' || message.read ? 'is-read' : ''
                    }`}
                    aria-label={
                      folder === 'inbox' && !message.read
                        ? 'Unread message'
                        : 'Read message'
                    }
                  />
                  <strong className="mail-correspondent">{correspondent}</strong>
                  <Button
                    type="button"
                    variant="link"
                    className="mail-star"
                    aria-label={`Star message: ${message.subject}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <i className="bi bi-star" aria-hidden="true" />
                  </Button>
                  <div className="mail-summary">
                    <h2>{message.subject}</h2>
                    <span aria-hidden="true">—</span>
                    <p>{message.bodyText}</p>
                  </div>
                  <time dateTime={new Date(message.createdAt).toISOString()}>
                    {formatMailDate(message.createdAt)}
                  </time>
                </ListGroup.Item>
              )
            })}
          </ListGroup>
        </>
      )}
    </Card>
  )
}

function MailMessageDetail({ folder, message, error, onBack }) {
  const senderName = message.senderEmail.split('@')[0]
  const avatarLetter = senderName.charAt(0).toUpperCase()

  return (
    <Card className="mail-detail-card border-0">
      <Card.Header className="mail-detail-toolbar">
        <Button
          type="button"
          variant="light"
          className="mail-detail-back"
          onClick={onBack}
        >
          <i className="bi bi-arrow-left me-2" aria-hidden="true" />
          Back to {folder === 'inbox' ? 'Inbox' : 'Sent'}
        </Button>
        <ButtonGroup aria-label="Message actions">
          <Button type="button" variant="light" disabled>
            <i className="bi bi-archive me-2" aria-hidden="true" />
            Archive
          </Button>
          <Button type="button" variant="light" disabled>
            <i className="bi bi-trash3 me-2" aria-hidden="true" />
            Delete
          </Button>
        </ButtonGroup>
      </Card.Header>

      {error && (
        <Alert variant="danger" className="m-3 mb-0" role="alert">
          {error}
        </Alert>
      )}

      <Card.Body className="mail-detail-body">
        <div className="mail-detail-subject">
          <span>Message</span>
          <h1>{message.subject}</h1>
        </div>

        <div className="mail-detail-sender">
          <span className="mail-detail-avatar" aria-hidden="true">
            {avatarLetter}
          </span>
          <div>
            <strong>{message.senderEmail}</strong>
            <span>
              To {message.recipientEmail}
            </span>
          </div>
          <time dateTime={new Date(message.createdAt).toISOString()}>
            {formatMailDate(message.createdAt)}
          </time>
        </div>

        <article className="mail-detail-message">{message.bodyText}</article>
      </Card.Body>
    </Card>
  )
}

function MailboxScreen({ email, onLogout }) {
  const [mailboxState, dispatch] = useReducer(
    mailboxReducer,
    initialMailboxState,
  )
  const {
    activeFolder,
    isComposing,
    messages,
    loadingMessages,
    mailError,
    sentNotice,
    refreshKey,
    searchQuery,
    selectedMessage,
    unreadCount,
  } = mailboxState

  const loadFolder = useCallback(async () => {
    if (!['inbox', 'sent'].includes(activeFolder)) {
      return
    }

    try {
      const folderMessages = await getMailboxFolder({
        email,
        folder: activeFolder,
        token: localStorage.getItem(AUTH_TOKEN_KEY),
      })
      dispatch({
        type: 'folder/loadSucceeded',
        folder: activeFolder,
        messages: folderMessages,
      })
    } catch (error) {
      dispatch({
        type: 'folder/loadFailed',
        folder: activeFolder,
        error:
          error.message || 'We could not load this folder. Please try again.',
      })
    }
  }, [activeFolder, email])

  useEffect(() => {
    const loadTimer = window.setTimeout(loadFolder, 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadFolder, refreshKey])

  const openFolder = (folder) => {
    dispatch({ type: 'folder/opened', folder })
  }

  const handleSent = (message) => {
    dispatch({ type: 'message/sent', message })
  }

  const refreshFolder = () => {
    dispatch({ type: 'folder/refreshed' })
  }

  const openMessage = async (message) => {
    const shouldMarkRead = activeFolder === 'inbox' && !message.read
    dispatch({ type: 'message/opened', message })

    if (!shouldMarkRead) {
      return
    }

    try {
      await markMailAsRead({
        message,
        recipientEmail: email,
        token: localStorage.getItem(AUTH_TOKEN_KEY),
      })
    } catch (error) {
      dispatch({
        type: 'message/readFailed',
        messageId: message.id,
        error:
          error.message ||
          'We could not save the read status. Please try again.',
      })
    }
  }

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const visibleMessages = normalizedSearch
    ? messages.filter((message) =>
        [
          message.senderEmail,
          message.recipientEmail,
          message.subject,
          message.bodyText,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch)),
      )
    : messages

  return (
    <div className="mailbox-screen">
      <Navbar className="site-navbar mailbox-navbar">
        <Container fluid className="px-lg-4">
          <Brand onClick={() => openFolder('inbox')} />
          <Form className="mailbox-search d-none d-md-flex" role="search">
            <i className="bi bi-search" aria-hidden="true" />
            <Form.Control
              type="search"
              placeholder="Search mail"
              aria-label="Search mail"
              value={searchQuery}
              onChange={(event) =>
                dispatch({
                  type: 'search/changed',
                  query: event.target.value,
                })
              }
            />
          </Form>
          <Stack direction="horizontal" gap={3}>
            <span className="signed-in-email d-none d-sm-inline">{email}</span>
            <Button variant="outline-primary" className="nav-signin" onClick={onLogout}>
              <i className="bi bi-box-arrow-right me-2" />
              Log out
            </Button>
          </Stack>
        </Container>
      </Navbar>

      <main className="mailbox-workspace">
        <aside className="mailbox-sidebar">
          <Button
            variant="primary"
            size="lg"
            className="compose-button"
            onClick={() => dispatch({ type: 'composer/opened' })}
          >
            <i className="bi bi-pencil-square" aria-hidden="true" />
            Compose
          </Button>

          <Nav className="mailbox-folders flex-column">
            <Nav.Link
              as="button"
              active={!isComposing && activeFolder === 'inbox'}
              onClick={() => openFolder('inbox')}
            >
              <i className="bi bi-inbox" aria-hidden="true" />
              Inbox
              <Badge
                pill
                bg="primary"
                className="folder-count"
                data-testid="inbox-unread-count"
                aria-label={`${unreadCount} unread messages`}
              >
                {unreadCount}
              </Badge>
            </Nav.Link>
            <Nav.Link
              as="button"
              active={!isComposing && activeFolder === 'sent'}
              onClick={() => openFolder('sent')}
            >
              <i className="bi bi-send" aria-hidden="true" />
              Sent
            </Nav.Link>
          </Nav>

          <div className="mailbox-storage">
            <i className="bi bi-cloud-check" aria-hidden="true" />
            <div>
              <strong>Firebase synced</strong>
              <span>Mail stays with your account</span>
            </div>
          </div>
        </aside>

        <section className="mailbox-content">
          {sentNotice && (
            <Alert
              variant="success"
              dismissible
              onClose={() => dispatch({ type: 'notice/dismissed' })}
              className="mail-sent-alert"
            >
              <i className="bi bi-check-circle-fill me-2" aria-hidden="true" />
              {sentNotice}
            </Alert>
          )}

          {isComposing ? (
            <ComposeMail
              senderEmail={email}
              onClose={() => dispatch({ type: 'composer/closed' })}
              onSent={handleSent}
            />
          ) : selectedMessage ? (
            <MailMessageDetail
              folder={activeFolder}
              message={selectedMessage}
              error={mailError}
              onBack={() => dispatch({ type: 'message/closed' })}
            />
          ) : activeFolder === 'welcome' ? (
            <Card className="welcome-card border-0">
              <Card.Body>
                <div className="welcome-mail-icon" aria-hidden="true">
                  <i className="bi bi-envelope-open-heart-fill" />
                </div>
                <Badge pill bg="light" text="primary" className="eyebrow">
                  Login successful
                </Badge>
                <h1>Welcome to your mail box</h1>
                <p>
                  Write a thoughtful message, style it your way, and Postly will
                  save a copy for both you and your recipient.
                </p>

                <Button
                  variant="primary"
                  size="lg"
                  className="welcome-compose-button rounded-pill"
                  onClick={() => dispatch({ type: 'composer/opened' })}
                >
                  <i className="bi bi-pencil-square me-2" aria-hidden="true" />
                  Compose your first mail
                </Button>

                <Row className="g-3 welcome-stats">
                  <Col sm={4}>
                    <button
                      type="button"
                      className="welcome-stat"
                      onClick={() => openFolder('inbox')}
                    >
                      <i className="bi bi-inbox" />
                      <strong>Inbox</strong>
                      <span>Mail sent to you</span>
                    </button>
                  </Col>
                  <Col sm={4}>
                    <div className="welcome-stat">
                      <i className="bi bi-type-bold" />
                      <strong>Rich editor</strong>
                      <span>Bold and highlight</span>
                    </div>
                  </Col>
                  <Col sm={4}>
                    <button
                      type="button"
                      className="welcome-stat"
                      onClick={() => openFolder('sent')}
                    >
                      <i className="bi bi-send" />
                      <strong>Sent</strong>
                      <span>Your outgoing mail</span>
                    </button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ) : (
            <MailFolder
              folder={activeFolder}
              messages={visibleMessages}
              loading={loadingMessages}
              error={mailError}
              onRefresh={refreshFolder}
              onOpenMessage={openMessage}
            />
          )}
        </section>
      </main>
    </div>
  )
}

function getInitialAuthState() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const requestedScreen = window.location.hash === '#login' ? 'login' : 'signup'

  return {
    screen: token ? 'mailbox' : requestedScreen,
    email: token ? localStorage.getItem(AUTH_EMAIL_KEY) || '' : '',
  }
}

function App() {
  const [initialAuthState] = useState(getInitialAuthState)
  const [screen, setScreen] = useState(initialAuthState.screen)
  const [authenticatedEmail, setAuthenticatedEmail] = useState(
    initialAuthState.email,
  )

  const showSignup = () => setScreen('signup')
  const showLogin = () => setScreen('login')

  const handleAuthenticated = (email) => {
    setAuthenticatedEmail(email)
    setScreen('mailbox')
  }

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth)
      }
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_EMAIL_KEY)
      setAuthenticatedEmail('')
      setScreen('login')
    }
  }

  if (screen === 'mailbox') {
    return <MailboxScreen email={authenticatedEmail} onLogout={handleLogout} />
  }

  return (
    <div className="app-shell">
      <SiteNavbar
        screen={screen}
        onLogin={showLogin}
        onSignup={showSignup}
      />

      <main className={`signup-main ${screen === 'login' ? 'login-view' : ''}`}>
        <div className="background-orb background-orb-one" aria-hidden="true" />
        <div className="background-orb background-orb-two" aria-hidden="true" />

        <Container className="position-relative">
          <Row className="align-items-center justify-content-between g-5">
            <AuthIntro screen={screen} />

            <Col lg={5} xl={4}>
              {screen === 'signup' ? (
                <SignupCard onLogin={showLogin} />
              ) : (
                <LoginCard
                  onSignup={showSignup}
                  onAuthenticated={handleAuthenticated}
                />
              )}

              <p className="terms-copy">
                By continuing, you agree to our <a href="#terms">Terms</a> and{' '}
                <a href="#privacy">Privacy Policy</a>.
              </p>
            </Col>
          </Row>
        </Container>
      </main>
    </div>
  )
}

export default App
