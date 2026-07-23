# Postly signup

A responsive React Bootstrap signup screen backed by Firebase email/password
authentication.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Replace the placeholder values with the web app configuration from your
   Firebase project.
4. In Firebase Console, enable **Authentication → Sign-in method →
   Email/Password**.
5. Start the app with `npm run dev`.

The form requires email, password, and password confirmation. It prevents
submission until the fields are complete and the passwords match, translates
common Firebase errors into user-friendly messages, and logs
`User has successfully signed up.` after successful account creation.

## Tests

Run the signup component test suite once with:

```bash
npm run test:run
```

Use `npm test` while developing to run Vitest in watch mode.
