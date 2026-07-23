import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
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
import './App.css'

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

function MailboxScreen({ email, onLogout }) {
  return (
    <div className="mailbox-screen">
      <Navbar className="site-navbar mailbox-navbar">
        <Container>
          <Brand onClick={() => {}} />
          <Stack direction="horizontal" gap={3}>
            <span className="signed-in-email d-none d-sm-inline">{email}</span>
            <Button variant="outline-primary" className="nav-signin" onClick={onLogout}>
              <i className="bi bi-box-arrow-right me-2" />
              Log out
            </Button>
          </Stack>
        </Container>
      </Navbar>

      <main className="mailbox-home">
        <div className="mailbox-home-orb mailbox-home-orb-one" aria-hidden="true" />
        <div className="mailbox-home-orb mailbox-home-orb-two" aria-hidden="true" />
        <Container className="position-relative">
          <Row className="justify-content-center">
            <Col lg={9} xl={8}>
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
                    Your Postly space is ready. This is a preview of the mailbox
                    experience that will live here.
                  </p>

                  <Row className="g-3 welcome-stats">
                    <Col sm={4}>
                      <div className="welcome-stat">
                        <i className="bi bi-inbox" />
                        <strong>Inbox</strong>
                        <span>All caught up</span>
                      </div>
                    </Col>
                    <Col sm={4}>
                      <div className="welcome-stat">
                        <i className="bi bi-star" />
                        <strong>Starred</strong>
                        <span>Nothing saved yet</span>
                      </div>
                    </Col>
                    <Col sm={4}>
                      <div className="welcome-stat">
                        <i className="bi bi-send" />
                        <strong>Sent</strong>
                        <span>Ready when you are</span>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
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
