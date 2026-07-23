export const initialMailboxState = {
  activeFolder: 'inbox',
  isComposing: false,
  messages: [],
  loadingMessages: true,
  mailError: '',
  sentNotice: '',
  refreshKey: 0,
  searchQuery: '',
  selectedMessage: null,
  unreadCount: 0,
  deletingMessageIds: [],
  markingReadMessageIds: [],
}

const countUnread = (messages) =>
  messages.reduce((total, message) => total + (message.read ? 0 : 1), 0)

const messageFields = [
  'id',
  'senderEmail',
  'recipientEmail',
  'subject',
  'bodyHtml',
  'bodyText',
  'createdAt',
  'read',
]

const messagesAreEqual = (first, second) =>
  messageFields.every((field) => first[field] === second[field])

const reconcileMessages = (currentMessages, incomingMessages) => {
  if (
    currentMessages.length === incomingMessages.length &&
    currentMessages.every((message, index) =>
      messagesAreEqual(message, incomingMessages[index]),
    )
  ) {
    return currentMessages
  }

  const currentById = new Map(
    currentMessages.map((message) => [message.id, message]),
  )

  return incomingMessages.map((message) => {
    const currentMessage = currentById.get(message.id)
    return currentMessage && messagesAreEqual(currentMessage, message)
      ? currentMessage
      : message
  })
}

const preservePendingReadStatus = (messages, markingReadMessageIds) =>
  messages.map((message) =>
    markingReadMessageIds.includes(message.id) && !message.read
      ? { ...message, read: true }
      : message,
  )

export function mailboxReducer(state, action) {
  switch (action.type) {
    case 'folder/opened':
      return {
        ...state,
        activeFolder: action.folder,
        isComposing: false,
        selectedMessage: null,
        sentNotice: '',
        loadingMessages: true,
        mailError: '',
        deletingMessageIds: [],
        refreshKey: state.refreshKey + 1,
      }

    case 'folder/loadSucceeded': {
      if (action.folder !== state.activeFolder) {
        return state
      }

      const loadedMessages =
        action.folder === 'inbox'
          ? preservePendingReadStatus(
              action.messages,
              state.markingReadMessageIds,
            )
          : action.messages

      return {
        ...state,
        messages: reconcileMessages(state.messages, loadedMessages),
        loadingMessages: false,
        mailError: '',
        unreadCount:
          action.folder === 'inbox'
            ? countUnread(loadedMessages)
            : state.unreadCount,
      }
    }

    case 'folder/loadFailed':
      if (action.folder !== state.activeFolder) {
        return state
      }

      return {
        ...state,
        messages: [],
        loadingMessages: false,
        mailError: action.error,
        unreadCount:
          action.folder === 'inbox' ? 0 : state.unreadCount,
      }

    case 'folder/refreshed':
      return {
        ...state,
        loadingMessages: true,
        mailError: '',
        refreshKey: state.refreshKey + 1,
      }

    case 'composer/opened':
      return {
        ...state,
        isComposing: true,
        selectedMessage: null,
        sentNotice: '',
      }

    case 'composer/closed':
      return { ...state, isComposing: false }

    case 'message/sent':
      return {
        ...state,
        sentNotice: `Your message to ${action.message.recipientEmail} was sent.`,
        isComposing: false,
        selectedMessage: null,
        activeFolder: 'sent',
        loadingMessages: true,
        mailError: '',
        refreshKey: state.refreshKey + 1,
      }

    case 'notice/dismissed':
      return { ...state, sentNotice: '' }

    case 'search/changed':
      return { ...state, searchQuery: action.query }

    case 'inbox/pollSucceeded': {
      const inboxMessages = preservePendingReadStatus(
        action.messages,
        state.markingReadMessageIds,
      )
      const unreadCount = countUnread(inboxMessages)

      if (state.activeFolder !== 'inbox') {
        return unreadCount === state.unreadCount
          ? state
          : { ...state, unreadCount }
      }

      const messages = reconcileMessages(state.messages, inboxMessages)

      return messages === state.messages && unreadCount === state.unreadCount
        ? state
        : { ...state, messages, unreadCount }
    }

    case 'message/opened': {
      const shouldMarkRead =
        state.activeFolder === 'inbox' && !action.message.read
      const openedMessage = shouldMarkRead
        ? { ...action.message, read: true }
        : action.message

      return {
        ...state,
        selectedMessage: openedMessage,
        messages: shouldMarkRead
          ? state.messages.map((message) =>
              message.id === action.message.id
                ? { ...message, read: true }
                : message,
            )
          : state.messages,
        unreadCount: shouldMarkRead
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
        markingReadMessageIds: shouldMarkRead
          ? [...state.markingReadMessageIds, action.message.id]
          : state.markingReadMessageIds,
        mailError: '',
      }
    }

    case 'message/readSucceeded':
      return {
        ...state,
        markingReadMessageIds: state.markingReadMessageIds.filter(
          (messageId) => messageId !== action.messageId,
        ),
      }

    case 'message/readFailed':
      return {
        ...state,
        selectedMessage:
          state.selectedMessage?.id === action.messageId
            ? { ...state.selectedMessage, read: false }
            : state.selectedMessage,
        messages: state.messages.map((message) =>
          message.id === action.messageId
            ? { ...message, read: false }
            : message,
        ),
        unreadCount: state.unreadCount + 1,
        markingReadMessageIds: state.markingReadMessageIds.filter(
          (messageId) => messageId !== action.messageId,
        ),
        mailError: action.error,
      }

    case 'message/closed':
      return { ...state, selectedMessage: null }

    case 'message/deleteStarted':
      return {
        ...state,
        deletingMessageIds: [
          ...state.deletingMessageIds,
          action.messageId,
        ],
        mailError: '',
      }

    case 'message/deleteSucceeded': {
      const deletedMessage =
        action.folder === state.activeFolder
          ? state.messages.find((message) => message.id === action.messageId)
          : null
      const deletedUnreadMessage =
        action.folder === 'inbox' && deletedMessage && !deletedMessage.read

      return {
        ...state,
        messages:
          action.folder === state.activeFolder
            ? state.messages.filter(
                (message) => message.id !== action.messageId,
              )
            : state.messages,
        selectedMessage:
          state.selectedMessage?.id === action.messageId
            ? null
            : state.selectedMessage,
        unreadCount: deletedUnreadMessage
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
        deletingMessageIds: state.deletingMessageIds.filter(
          (messageId) => messageId !== action.messageId,
        ),
        mailError: '',
      }
    }

    case 'message/deleteFailed':
      return {
        ...state,
        deletingMessageIds: state.deletingMessageIds.filter(
          (messageId) => messageId !== action.messageId,
        ),
        mailError:
          action.folder === state.activeFolder ? action.error : state.mailError,
      }

    default:
      return state
  }
}
