import { useCallback } from 'react'
import {
  deleteMail,
  getMailboxFolder,
  markMailAsRead,
  sendMail,
} from '../mailService'
import { AUTH_TOKEN_KEY } from '../storageKeys'

const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY)

export function useMailApi() {
  const sendMessage = useCallback((message) => {
    return sendMail({
      ...message,
      token: getAuthToken(),
    })
  }, [])

  const loadMailboxFolder = useCallback(({ email, folder }) => {
    return getMailboxFolder({
      email,
      folder,
      token: getAuthToken(),
    })
  }, [])

  const markMessageAsRead = useCallback(({ message, recipientEmail }) => {
    return markMailAsRead({
      message,
      recipientEmail,
      token: getAuthToken(),
    })
  }, [])

  const removeMessage = useCallback(({ email, folder, messageId }) => {
    return deleteMail({
      email,
      folder,
      messageId,
      token: getAuthToken(),
    })
  }, [])

  return {
    sendMessage,
    loadMailboxFolder,
    markMessageAsRead,
    removeMessage,
  }
}
