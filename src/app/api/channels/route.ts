import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ChannelWithCount {
  id: string
  name: string
  description: string | null
  type: string
  creatorId: string
  _count: { members: number }
}

// GET /api/channels - Get all channels for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get public channels and private channels the user is a member of
    const channels = await prisma.channel.findMany({
      where: {
        OR: [
          { type: 'public' },
          {
            type: 'private',
            members: {
              some: { userId: session.user.id }
            }
          }
        ]
      },
      include: {
        _count: {
          select: { members: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    const formattedChannels = (channels as ChannelWithCount[]).map((channel) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      type: channel.type,
      creatorId: channel.creatorId,
      memberCount: channel._count.members,
    }))

    return NextResponse.json(formattedChannels)
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/channels - Create a new channel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, type = 'public' } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 })
    }

    // Check if channel name already exists
    const existingChannel = await prisma.channel.findFirst({
      where: { name: name.trim() }
    })

    if (existingChannel) {
      return NextResponse.json({ error: 'Channel name already exists' }, { status: 400 })
    }

    // Create channel and add creator as admin member
    const channel = await prisma.channel.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type,
        creatorId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'admin'
          }
        }
      },
      include: {
        _count: {
          select: { members: true }
        }
      }
    })

    return NextResponse.json({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      type: channel.type,
      creatorId: channel.creatorId,
      memberCount: channel._count.members,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
