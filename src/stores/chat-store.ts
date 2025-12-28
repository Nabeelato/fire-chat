import { create } from 'zustand'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string | null
  status: 'online' | 'offline' | 'away'
}

export interface Channel {
  id: string
  name: string
  description?: string | null
  type: 'public' | 'private'
  creatorId: string
  memberCount?: number
  unreadCount?: number
}

export interface Message {
  id: string
  content: string
  userId: string
  channelId: string
  type: 'text' | 'file' | 'system'
  timestamp: string
  user?: User
  files?: FileAttachment[]
}

export interface FileAttachment {
  id: string
  filename: string
  originalName: string
  path: string
  size: number
  mimeType: string
}

export interface DirectMessage {
  id: string
  content: string
  senderId: string
  receiverId: string
  type: 'text' | 'file'
  timestamp: string
  sender?: User
}

export interface DirectConversation {
  id: string
  user: User
  lastMessage?: DirectMessage
  unreadCount: number
}

interface ChatState {
  // Current user
  currentUser: User | null
  setCurrentUser: (user: User | null) => void

  // Channels
  channels: Channel[]
  setChannels: (channels: Channel[]) => void
  addChannel: (channel: Channel) => void
  updateChannel: (channelId: string, updates: Partial<Channel>) => void
  removeChannel: (channelId: string) => void

  // Active channel
  activeChannel: Channel | null
  setActiveChannel: (channel: Channel | null) => void

  // Messages
  messages: Message[]
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  deleteMessage: (messageId: string) => void

  // Direct messages
  directConversations: DirectConversation[]
  setDirectConversations: (conversations: DirectConversation[]) => void
  addDirectConversation: (conversation: DirectConversation) => void
  
  activeDirectConversation: DirectConversation | null
  setActiveDirectConversation: (conversation: DirectConversation | null) => void

  directMessages: DirectMessage[]
  setDirectMessages: (messages: DirectMessage[]) => void
  addDirectMessage: (message: DirectMessage) => void

  // Online users
  onlineUsers: Set<string>
  setOnlineUsers: (users: Set<string>) => void
  addOnlineUser: (userId: string) => void
  removeOnlineUser: (userId: string) => void

  // Typing indicators
  typingUsers: Map<string, string[]> // channelId -> userIds
  setTypingUsers: (channelId: string, userIds: string[]) => void

  // UI State
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void

  // View mode
  viewMode: 'channels' | 'dms'
  setViewMode: (mode: 'channels' | 'dms') => void
}

export const useChatStore = create<ChatState>((set) => ({
  // Current user
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Channels
  channels: [],
  setChannels: (channels) => set({ channels }),
  addChannel: (channel) => set((state) => ({ channels: [...state.channels, channel] })),
  updateChannel: (channelId, updates) => set((state) => ({
    channels: state.channels.map((ch) =>
      ch.id === channelId ? { ...ch, ...updates } : ch
    ),
  })),
  removeChannel: (channelId) => set((state) => ({
    channels: state.channels.filter((ch) => ch.id !== channelId),
  })),

  // Active channel
  activeChannel: null,
  setActiveChannel: (channel) => set({ activeChannel: channel, activeDirectConversation: null, viewMode: 'channels' }),

  // Messages
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    ),
  })),
  deleteMessage: (messageId) => set((state) => ({
    messages: state.messages.filter((msg) => msg.id !== messageId),
  })),

  // Direct messages
  directConversations: [],
  setDirectConversations: (conversations) => set({ directConversations: conversations }),
  addDirectConversation: (conversation) => set((state) => ({
    directConversations: [...state.directConversations.filter(c => c.id !== conversation.id), conversation],
  })),

  activeDirectConversation: null,
  setActiveDirectConversation: (conversation) => set({ 
    activeDirectConversation: conversation, 
    activeChannel: null,
    viewMode: 'dms'
  }),

  directMessages: [],
  setDirectMessages: (messages) => set({ directMessages: messages }),
  addDirectMessage: (message) => set((state) => ({ directMessages: [...state.directMessages, message] })),

  // Online users
  onlineUsers: new Set(),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  addOnlineUser: (userId) => set((state) => {
    const newSet = new Set(state.onlineUsers)
    newSet.add(userId)
    return { onlineUsers: newSet }
  }),
  removeOnlineUser: (userId) => set((state) => {
    const newSet = new Set(state.onlineUsers)
    newSet.delete(userId)
    return { onlineUsers: newSet }
  }),

  // Typing indicators
  typingUsers: new Map(),
  setTypingUsers: (channelId, userIds) => set((state) => {
    const newMap = new Map(state.typingUsers)
    newMap.set(channelId, userIds)
    return { typingUsers: newMap }
  }),

  // UI State
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // View mode
  viewMode: 'channels',
  setViewMode: (mode) => set({ viewMode: mode }),
}))
