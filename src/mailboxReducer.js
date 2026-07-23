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
}

const countUnread = (messages) =>
  messages.reduce((total, message) => total + (message.read ? 0 : 1), 0)

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
      }

    case 'folder/loadSucceeded':
      if (action.folder !== state.activeFolder) {
        return state
      }

      return {
        ...state,
        messages: action.messages,
        loadingMessages: false,
        mailError: '',
        unreadCount:
          action.folder === 'inbox'
            ? countUnread(action.messages)
            : state.unreadCount,
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
        mailError: '',
      }
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
