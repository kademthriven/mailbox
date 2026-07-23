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

The signup form requires email, password, and password confirmation. It
prevents submission until the fields are complete and the passwords match,
translates common Firebase errors into user-friendly messages, and logs
`User has successfully signed up.` after successful account creation.

Existing users can open the login screen and authenticate with their Firebase
email/password credentials. After successful login, the app:

- retrieves the Firebase ID token;
- stores it in local storage under `postlyAuthToken`;
- shows the authenticated “Welcome to your mail box” screen;
- restores that screen while the stored token is present; and
- removes the stored token and email when the user logs out.

## Tests

Run the authentication component test suite once with:

```bash
npm run test:run
```

Use `npm test` while developing to run Vitest in watch mode.
