import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer((req, res) => {
  // Health check endpoint for Railway
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'fire-chat-socket' }))
    return
  }
  res.writeHead(404)
  res.end()
})

const allowedOrigins = [
  process.env.NEXTAUTH_URL,
  'http://localhost:3000',
  'https://fire-chat-beta.vercel.app',
  /\.vercel\.app$/,
].filter(Boolean)

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

interface OnlineUser {
  odiv: string
  socketId: string
  userId: string
  status: 'online' | 'away'
}

const onlineUsers = new Map<string, OnlineUser>()

io.on('connection', (socket: Socket) => {
  const userId = socket.handshake.auth.userId

  if (!userId) {
    socket.disconnect()
    return
  }

  console.log(`User connected: ${userId}`)

  // Store user connection
  onlineUsers.set(userId, {
    odiv: Date.now().toString(),
    socketId: socket.id,
    userId,
    status: 'online',
  })

  // Broadcast user online status
  io.emit('user:online', { userId, status: 'online' })

  // Send current online users to the connecting user
  socket.emit('users:online', Array.from(onlineUsers.keys()))

  // Join user's personal room for direct messages
  socket.join(`user:${userId}`)

  // Handle joining a channel
  socket.on('channel:join', (channelId: string) => {
    socket.join(`channel:${channelId}`)
    console.log(`User ${userId} joined channel ${channelId}`)
  })

  // Handle leaving a channel
  socket.on('channel:leave', (channelId: string) => {
    socket.leave(`channel:${channelId}`)
    console.log(`User ${userId} left channel ${channelId}`)
  })

  // Handle new channel message
  socket.on('message:send', (data: {
    channelId: string
    message: unknown
  }) => {
    // Broadcast to all users in the channel
    io.to(`channel:${data.channelId}`).emit('message:new', data.message)
  })

  // Handle direct message
  socket.on('dm:send', (data: {
    receiverId: string
    message: unknown
  }) => {
    // Send to receiver
    io.to(`user:${data.receiverId}`).emit('dm:new', data.message)
    // Also send back to sender for confirmation
    socket.emit('dm:new', data.message)
  })

  // Handle typing indicator
  socket.on('typing:start', (data: { channelId: string; userId: string; userName: string }) => {
    socket.to(`channel:${data.channelId}`).emit('typing:start', data)
  })

  socket.on('typing:stop', (data: { channelId: string; userId: string }) => {
    socket.to(`channel:${data.channelId}`).emit('typing:stop', data)
  })

  // Handle DM typing
  socket.on('dm:typing:start', (data: { receiverId: string; userId: string; userName: string }) => {
    io.to(`user:${data.receiverId}`).emit('dm:typing:start', data)
  })

  socket.on('dm:typing:stop', (data: { receiverId: string; userId: string }) => {
    io.to(`user:${data.receiverId}`).emit('dm:typing:stop', data)
  })

  // Handle status update
  socket.on('status:update', (status: 'online' | 'away' | 'offline') => {
    const user = onlineUsers.get(userId)
    if (user) {
      user.status = status === 'offline' ? 'online' : status
      io.emit('user:status', { userId, status })
    }
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`)
    onlineUsers.delete(userId)
    io.emit('user:offline', { userId })
  })
})

const PORT = parseInt(process.env.PORT || process.env.SOCKET_PORT || '3001')

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.io server running on port ${PORT}`)
})

export { io }
