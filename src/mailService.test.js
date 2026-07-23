import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('Firebase mail service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv(
      'VITE_FIREBASE_DATABASE_URL',
      'https://postly-demo-default-rtdb.firebaseio.com',
    )
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('posts a new message and fans it out to inbox and sent mailboxes', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ name: 'mail-123' }))
      .mockResolvedValueOnce(jsonResponse(null))
    const { mailboxKeyForEmail, sendMail } = await import('./mailService')

    const result = await sendMail({
      senderEmail: 'SENDER@example.com',
      recipientEmail: 'receiver@example.com',
      subject: '  Hello  ',
      bodyHtml: '<p>Hi there</p>',
      bodyText: 'Hi there',
      token: 'id-token',
    })

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://postly-demo-default-rtdb.firebaseio.com/messages.json?auth=id-token',
      expect.objectContaining({ method: 'POST' }),
    )

    const patchOptions = fetch.mock.calls[1][1]
    const patchBody = JSON.parse(patchOptions.body)
    const receiverKey = mailboxKeyForEmail('receiver@example.com')
    const senderKey = mailboxKeyForEmail('sender@example.com')

    expect(patchOptions.method).toBe('PATCH')
    expect(patchBody[`mailboxes/${receiverKey}/inbox/mail-123`]).toEqual(
      expect.objectContaining({ id: 'mail-123', subject: 'Hello' }),
    )
    expect(patchBody[`mailboxes/${senderKey}/sent/mail-123`]).toEqual(
      expect.objectContaining({ id: 'mail-123', subject: 'Hello' }),
    )
    expect(result.id).toBe('mail-123')
  })

  it('retrieves and sorts a mailbox folder newest first', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        older: { id: 'older', createdAt: 10 },
        newer: { id: 'newer', createdAt: 20 },
      }),
    )
    const { getMailboxFolder, mailboxKeyForEmail } = await import(
      './mailService'
    )

    const messages = await getMailboxFolder({
      email: 'person@example.com',
      folder: 'inbox',
      token: 'id-token',
    })

    expect(fetch).toHaveBeenCalledWith(
      `https://postly-demo-default-rtdb.firebaseio.com/mailboxes/${mailboxKeyForEmail(
        'person@example.com',
      )}/inbox.json?auth=id-token`,
    )
    expect(messages.map((message) => message.id)).toEqual(['newer', 'older'])
  })

  it('retrieves sent mail from the authenticated sender mailbox', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        sent: {
          id: 'sent',
          senderEmail: 'person@example.com',
          recipientEmail: 'recipient@example.com',
          createdAt: 20,
        },
      }),
    )
    const { getMailboxFolder, mailboxKeyForEmail } = await import(
      './mailService'
    )

    const messages = await getMailboxFolder({
      email: 'person@example.com',
      folder: 'sent',
      token: 'id-token',
    })

    expect(fetch).toHaveBeenCalledWith(
      `https://postly-demo-default-rtdb.firebaseio.com/mailboxes/${mailboxKeyForEmail(
        'person@example.com',
      )}/sent.json?auth=id-token`,
    )
    expect(messages).toEqual([
      expect.objectContaining({
        id: 'sent',
        recipientEmail: 'recipient@example.com',
      }),
    ])
  })

  it('surfaces Firebase REST errors to the user interface', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ error: 'Permission denied' }, 401))
    const { getMailboxFolder } = await import('./mailService')

    await expect(
      getMailboxFolder({
        email: 'person@example.com',
        folder: 'sent',
        token: 'expired-token',
      }),
    ).rejects.toThrow('Permission denied')
  })

  it('persists read status in the recipient inbox', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(null))
    const { mailboxKeyForEmail, markMailAsRead } = await import('./mailService')
    const message = {
      id: 'mail-123',
      senderEmail: 'sender@example.com',
      recipientEmail: 'receiver@example.com',
      read: false,
    }

    await expect(
      markMailAsRead({
        message,
        recipientEmail: 'receiver@example.com',
        token: 'id-token',
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 'mail-123', read: true }))

    const requestOptions = fetch.mock.calls[0][1]
    const requestBody = JSON.parse(requestOptions.body)
    const receiverKey = mailboxKeyForEmail('receiver@example.com')

    expect(fetch).toHaveBeenCalledWith(
      `https://postly-demo-default-rtdb.firebaseio.com/mailboxes/${receiverKey}/inbox/mail-123.json?auth=id-token`,
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(requestBody).toEqual({ read: true })
  })

  it('rejects a mark-as-read request without a message ID', async () => {
    const { markMailAsRead } = await import('./mailService')

    await expect(
      markMailAsRead({
        message: { senderEmail: 'sender@example.com' },
        recipientEmail: 'receiver@example.com',
        token: 'id-token',
      }),
    ).rejects.toThrow('A message ID is required to mark mail as read.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('surfaces Firebase errors while marking a message as read', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ error: 'Read update was denied' }, 403),
    )
    const { markMailAsRead } = await import('./mailService')

    await expect(
      markMailAsRead({
        message: {
          id: 'mail-123',
          senderEmail: 'sender@example.com',
          recipientEmail: 'receiver@example.com',
          read: false,
        },
        recipientEmail: 'receiver@example.com',
        token: 'id-token',
      }),
    ).rejects.toThrow('Read update was denied')
  })

  it('deletes a message from the requested mailbox folder', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(null))
    const { deleteMail, mailboxKeyForEmail } = await import('./mailService')

    await expect(
      deleteMail({
        email: 'owner@example.com',
        folder: 'inbox',
        messageId: 'mail-123',
        token: 'id-token',
      }),
    ).resolves.toBe('mail-123')

    expect(fetch).toHaveBeenCalledWith(
      `https://postly-demo-default-rtdb.firebaseio.com/mailboxes/${mailboxKeyForEmail(
        'owner@example.com',
      )}/inbox/mail-123.json?auth=id-token`,
      { method: 'DELETE' },
    )
  })

  it('rejects deletion from an unknown mailbox folder', async () => {
    const { deleteMail } = await import('./mailService')

    await expect(
      deleteMail({
        email: 'owner@example.com',
        folder: 'archive',
        messageId: 'mail-123',
        token: 'id-token',
      }),
    ).rejects.toThrow('Unknown mailbox folder.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('surfaces Firebase errors while deleting a message', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ error: 'Delete permission denied' }, 403),
    )
    const { deleteMail } = await import('./mailService')

    await expect(
      deleteMail({
        email: 'owner@example.com',
        folder: 'sent',
        messageId: 'mail-123',
        token: 'id-token',
      }),
    ).rejects.toThrow('Delete permission denied')
  })
})
