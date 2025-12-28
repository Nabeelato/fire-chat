import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/direct-messages - Get all DM conversations
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get unique conversations (users the current user has exchanged messages with)
    const sentMessages = await prisma.directMessage.findMany({
      where: { senderId: session.user.id },
      select: { receiverId: true },
      distinct: ['receiverId'],
    })

    const receivedMessages = await prisma.directMessage.findMany({
      where: { receiverId: session.user.id },
      select: { senderId: true },
      distinct: ['senderId'],
    })

    const userIds = new Set([
      ...sentMessages.map((m: { receiverId: string }) => m.receiverId),
      ...receivedMessages.map((m: { senderId: string }) => m.senderId),
    ])

    // Get user details and last message for each conversation
    const conversations = await Promise.all(
      Array.from(userIds).map(async (userId) => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            status: true,
          }
        })

        const lastMessage = await prisma.directMessage.findFirst({
          where: {
            OR: [
              { senderId: session.user!.id, receiverId: userId },
              { senderId: userId, receiverId: session.user!.id },
            ]
          },
          orderBy: { timestamp: 'desc' },
        })

        return {
          id: userId,
          user,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            receiverId: lastMessage.receiverId,
            type: lastMessage.type,
            timestamp: lastMessage.timestamp.toISOString(),
          } : null,
          unreadCount: 0, // TODO: Implement unread tracking
        }
      })
    )

    // Sort by last message timestamp
    conversations.sort((a, b) => {
      if (!a.lastMessage) return 1
      if (!b.lastMessage) return -1
      return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
    })

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Error fetching DM conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
