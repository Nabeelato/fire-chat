"use client"

import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  connect: (userId: string) => void
  disconnect: () => void
  emit: (event: string, data: unknown) => void
  on: (event: string, callback: (data: unknown) => void) => void
  off: (event: string, callback?: (data: unknown) => void) => void
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (userId: string) => {
    const existingSocket = get().socket
    if (existingSocket?.connected) return

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { userId },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('Socket connected')
      set({ isConnected: true })
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      set({ isConnected: false })
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      set({ isConnected: false })
    })

    set({ socket })
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },

  emit: (event: string, data: unknown) => {
    const { socket } = get()
    if (socket?.connected) {
      socket.emit(event, data)
    }
  },

  on: (event: string, callback: (data: unknown) => void) => {
    const { socket } = get()
    if (socket) {
      socket.on(event, callback)
    }
  },

  off: (event: string, callback?: (data: unknown) => void) => {
    const { socket } = get()
    if (socket) {
      socket.off(event, callback)
    }
  },
}))
