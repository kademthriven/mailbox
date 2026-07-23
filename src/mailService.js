const DATABASE_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL?.replace(/\/$/, '')

export const isMailDatabaseConfigured = Boolean(DATABASE_URL)

const normalizeEmail = (email) => email.trim().toLowerCase()

export const mailboxKeyForEmail = (email) => {
  const bytes = new TextEncoder().encode(normalizeEmail(email))
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const firebaseUrl = (path, token) => {
  if (!isMailDatabaseConfigured) {
    throw new Error(
      'Firebase mail storage is not configured. Add VITE_FIREBASE_DATABASE_URL to your .env file.',
    )
  }

  const authQuery = token ? `?auth=${encodeURIComponent(token)}` : ''
  return `${DATABASE_URL}/${path}.json${authQuery}`
}

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const firebaseMessage = payload?.error
    throw new Error(
      typeof firebaseMessage === 'string'
        ? firebaseMessage
        : 'Firebase could not complete the request.',
    )
  }

  return payload
}

export const sendMail = async ({
  senderEmail,
  recipientEmail,
  subject,
  bodyHtml,
  bodyText,
  token,
}) => {
  const normalizedSender = normalizeEmail(senderEmail)
  const normalizedRecipient = normalizeEmail(recipientEmail)
  const createdAt = Date.now()
  const mail = {
    senderEmail: normalizedSender,
    recipientEmail: normalizedRecipient,
    subject: subject.trim(),
    bodyHtml,
    bodyText: bodyText.trim(),
    createdAt,
    read: false,
  }

  const createResponse = await fetch(firebaseUrl('messages', token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mail),
  })
  const created = await parseResponse(createResponse)

  if (!created?.name) {
    throw new Error('Firebase did not return a message ID.')
  }

  const message = { ...mail, id: created.name }
  const recipientKey = mailboxKeyForEmail(normalizedRecipient)
  const senderKey = mailboxKeyForEmail(normalizedSender)
  const fanOut = {
    [`mailboxes/${recipientKey}/inbox/${created.name}`]: message,
    [`mailboxes/${senderKey}/sent/${created.name}`]: message,
  }

  const fanOutResponse = await fetch(firebaseUrl('', token), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fanOut),
  })
  await parseResponse(fanOutResponse)

  return message
}

export const getMailboxFolder = async ({ email, folder, token }) => {
  if (!['inbox', 'sent'].includes(folder)) {
    throw new Error('Unknown mailbox folder.')
  }

  const mailboxKey = mailboxKeyForEmail(email)
  const response = await fetch(
    firebaseUrl(`mailboxes/${mailboxKey}/${folder}`, token),
  )
  const payload = await parseResponse(response)

  if (!payload) {
    return []
  }

  return Object.values(payload).sort((first, second) => {
    return second.createdAt - first.createdAt
  })
}

export const markMailAsRead = async ({ message, recipientEmail, token }) => {
  if (!message?.id) {
    throw new Error('A message ID is required to mark mail as read.')
  }

  const recipientKey = mailboxKeyForEmail(recipientEmail)
  const response = await fetch(
    firebaseUrl(`mailboxes/${recipientKey}/inbox/${message.id}`, token),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    },
  )
  await parseResponse(response)

  return { ...message, read: true }
}
