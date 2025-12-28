import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface MessageWithRelations {
  id: string
  content: string
  userId: string
  channelId: string
  type: string
  timestamp: Date
  user: {
    id: string
    name: string | null
    email: string
    avatar: string | null
    status: string
  }
  files: Array<{
    id: string
    filename: string
    originalName: string
    path: string
    size: number
    mimeType: string
  }>
}

// GET /api/channels/[channelId]/messages - Get messages for a channel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channelId } = await params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Check channel access
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          select: { userId: true }
        }
      }
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    if (channel.type === 'private') {
      const isMember = channel.members.some((m: { userId: string }) => m.userId === session.user!.id)
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { channelId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            status: true,
          }
        },
        files: true,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    })

    const formattedMessages = (messages as MessageWithRelations[]).map((msg) => ({
      id: msg.id,
      content: msg.content,
      userId: msg.userId,
      channelId: msg.channelId,
      type: msg.type,
      timestamp: msg.timestamp.toISOString(),
      user: {
        id: msg.user.id,
        name: msg.user.name,
        email: msg.user.email,
        avatar: msg.user.avatar,
        status: msg.user.status,
      },
      files: msg.files.map((f) => ({
        id: f.id,
        filename: f.filename,
        originalName: f.originalName,
        path: f.path,
        size: f.size,
        mimeType: f.mimeType,
      })),
    }))

    // Reverse to get chronological order
    formattedMessages.reverse()

    return NextResponse.json({
      messages: formattedMessages,
      nextCursor: messages.length === limit ? messages[messages.length - 1]?.id : null,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/channels/[channelId]/messages - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channelId } = await params
    const body = await request.json()
    const { content, type = 'text' } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Check channel membership
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          select: { userId: true }
        }
      }
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // For private channels, user must be a member
    // For public channels, auto-join on first message
    const isMember = channel.members.some((m: { userId: string }) => m.userId === session.user!.id)
    
    if (channel.type === 'private' && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!isMember && channel.type === 'public') {
      // Auto-join public channel
      await prisma.channelMember.create({
        data: {
          userId: session.user.id,
          channelId,
          role: 'member'
        }
      })
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        type,
        userId: session.user.id,
        channelId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            status: true,
          }
        },
        files: true,
      }
    })

    return NextResponse.json({
      id: message.id,
      content: message.content,
      userId: message.userId,
      channelId: message.channelId,
      type: message.type,
      timestamp: message.timestamp.toISOString(),
      user: {
        id: message.user.id,
        name: message.user.name,
        email: message.user.email,
        avatar: message.user.avatar,
        status: message.user.status,
      },
      files: [],
    }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
