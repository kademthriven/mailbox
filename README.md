# Postly mailbox

A responsive React Bootstrap mailbox with Firebase email/password
authentication, rich-text mail composition, inbox retrieval, and sent mail.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Replace every placeholder with the web app configuration from your
   Firebase project.
4. In Firebase Console, enable **Authentication > Sign-in method >
   Email/Password**.
5. Create a Firebase Realtime Database and add its URL as
   `VITE_FIREBASE_DATABASE_URL`.
6. Start the app with `npm run dev`.

## Authentication

The signup form requires email, password, and password confirmation. It
prevents incomplete submission, translates common Firebase errors, and logs
`User has successfully signed up.` after successful account creation.

On login, the app stores the Firebase ID token under `postlyAuthToken`, restores
the mailbox while that token is present, opens the authenticated user's Inbox,
and clears the stored session on logout.

## Compose and mail storage

The composer uses Tiptap for bold, italic, list, highlight, undo, and redo
formatting. Sending a message performs a Firebase REST `POST` to create the
canonical message, followed by an atomic multi-location `PATCH` that stores
copies under:

```text
messages/{messageId}
mailboxes/{recipientEmailKey}/inbox/{messageId}
mailboxes/{senderEmailKey}/sent/{messageId}
```

Email addresses are normalized and converted to URL-safe mailbox keys. This
structure lets recipients retrieve their inbox and senders retrieve their sent
mail without downloading unrelated users' messages.

The Inbox performs a Firebase REST `GET` for the signed-in email's mailbox key
as soon as authentication succeeds. Messages are shown newest-first with sender,
subject, body preview, timestamp, and a blue unread marker. Mailbox API data is
kept in a reducer so the list, selected message, and sidebar unread total stay in
sync. Opening a message shows its complete content and immediately updates its
Inbox copy to `read: true` through Firebase REST, so it remains read after a page
refresh. Users can also search the loaded messages, refresh from Firebase, or
open the existing rich-text editor with **Compose**.

## Tests

Run all component and Firebase mail-service tests once with:

```bash
npm run test:run
```

Use `npm test` while developing to run Vitest in watch mode.
