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
})
