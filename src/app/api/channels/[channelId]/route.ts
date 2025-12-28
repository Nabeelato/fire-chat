import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/channels/[channelId] - Get a specific channel
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
        },
        _count: {
          select: { members: true, messages: true }
        }
      }
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Check access for private channels
    if (channel.type === 'private') {
      const isMember = channel.members.some((m: { userId: string }) => m.userId === session.user!.id)
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      type: channel.type,
      creatorId: channel.creatorId,
      members: channel.members.map((m: { user: { id: string; name: string | null; email: string; avatar: string | null; status: string }; role: string; joinedAt: Date }) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar,
        status: m.user.status,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      memberCount: channel._count.members,
      messageCount: channel._count.messages,
    })
  } catch (error) {
    console.error('Error fetching channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/channels/[channelId] - Update a channel
export async function PATCH(
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
    const { name, description, type } = body

    // Check if user is admin of the channel
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

    const channel = await prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(type && { type }),
      }
    })

    return NextResponse.json(channel)
  } catch (error) {
    console.error('Error updating channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/channels/[channelId] - Delete a channel
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

    // Check if user is creator or admin
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    if (channel.creatorId !== session.user.id) {
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
    }

    await prisma.channel.delete({
      where: { id: channelId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
