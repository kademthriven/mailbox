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
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, isFirebaseConfigured } from './firebase'
import './App.css'

const firebaseErrorMessages = {
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

function App() {
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
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
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
        firebaseErrorMessages[firebaseError.code] ||
          'We could not create your account. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <Navbar expand="md" className="site-navbar" aria-label="Primary navigation">
        <Container>
          <Navbar.Brand href="#" className="brand-mark">
            <span className="brand-icon" aria-hidden="true">
              <i className="bi bi-envelope-paper-heart-fill" />
            </span>
            <span>Postly</span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="main-navigation" />
          <Navbar.Collapse id="main-navigation">
            <Nav className="ms-auto align-items-md-center">
              <Nav.Link href="#features">Features</Nav.Link>
              <Nav.Link href="#security">Security</Nav.Link>
              <Button
                variant="outline-primary"
                className="nav-signin ms-md-3"
                href="#signin"
              >
                Sign in
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="signup-main">
        <div className="background-orb background-orb-one" aria-hidden="true" />
        <div className="background-orb background-orb-two" aria-hidden="true" />

        <Container className="position-relative">
          <Row className="align-items-center justify-content-between g-5">
            <Col lg={6} className="intro-column">
              <Badge pill bg="light" text="primary" className="eyebrow">
                <i className="bi bi-stars me-2" />
                Your inbox, reimagined
              </Badge>

              <h1 className="hero-title">
                Join the calmer way to handle your mail.
              </h1>
              <p className="hero-copy">
                One thoughtfully organized inbox for every conversation that
                matters. Create your free account in less than a minute.
              </p>

              <Stack
                direction="horizontal"
                gap={4}
                className="trust-row flex-wrap"
              >
                <span>
                  <i className="bi bi-shield-check" /> Private by design
                </span>
                <span>
                  <i className="bi bi-lightning-charge" /> Quick setup
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

            <Col lg={5} xl={4}>
              <Card className="signup-card border-0">
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
                    <Alert
                      variant="danger"
                      className="form-alert"
                      role="alert"
                    >
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
                        Your account has been created successfully. Your inbox
                        is ready when you are.
                      </p>
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-100 rounded-pill"
                        href="#signin"
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
                            isInvalid={submitted && !isEmailValid}
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

                      <Form.Group
                        className="form-field"
                        controlId="signupPassword"
                      >
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
                              submitted &&
                              (password.length === 0 || password.length < 6)
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
                            aria-label={
                              showPassword ? 'Hide password' : 'Show password'
                            }
                            aria-pressed={showPassword}
                          >
                            <i
                              className={`bi ${
                                showPassword ? 'bi-eye-slash' : 'bi-eye'
                              }`}
                            />
                          </Button>
                          <Form.Control.Feedback type="invalid">
                            Use at least 6 characters.
                          </Form.Control.Feedback>
                        </InputGroup>
                      </Form.Group>

                      <Form.Group
                        className="form-field"
                        controlId="confirmPassword"
                      >
                        <Form.Label>Confirm password</Form.Label>
                        <InputGroup hasValidation>
                          <InputGroup.Text>
                            <i className="bi bi-shield-lock" />
                          </InputGroup.Text>
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter it once more"
                            value={confirmPassword}
                            onChange={(event) =>
                              setConfirmPassword(event.target.value)
                            }
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
                      <a href="#signin">Sign in here</a>
                    </p>
                  )}
                </Card.Body>
              </Card>

              <p className="terms-copy">
                By creating an account, you agree to our{' '}
                <a href="#terms">Terms</a> and{' '}
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
