import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/channels/[channelId]/members - Get channel members
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

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                status: true,
              }
            }
          }
        }
      }
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Check access for private channels
    if (channel.type === 'private') {
      const isMember = channel.members.some(m => m.userId === session.user!.id)
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const members = channel.members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      status: m.user.status,
      role: m.role,
      joinedAt: m.joinedAt,
    }))

    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching channel members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/channels/[channelId]/members - Add member to channel (invite)
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
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if requester is admin of the channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: session.user.id,
          channelId,
        }
      }
    })

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already a member
    const existingMembership = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId,
          channelId,
        }
      }
    })

    if (existingMembership) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
    }

    // Add member
    await prisma.channelMember.create({
      data: {
        userId,
        channelId,
        role: 'member'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding channel member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/channels/[channelId]/members - Remove member from channel
export async function DELETE(
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
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if requester is admin of the channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: session.user.id,
          channelId,
        }
      }
    })

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Cannot remove the channel creator
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    })

    if (channel?.creatorId === userId) {
      return NextResponse.json({ error: 'Cannot remove channel creator' }, { status: 400 })
    }

    // Remove member
    await prisma.channelMember.delete({
      where: {
        userId_channelId: {
          userId,
          channelId,
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing channel member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
