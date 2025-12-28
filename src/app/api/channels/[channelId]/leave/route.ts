import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/channels/[channelId]/leave - Leave a channel
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

    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Cannot leave if you're the creator
    if (channel.creatorId === session.user.id) {
      return NextResponse.json({ error: 'Channel creator cannot leave. Delete the channel instead.' }, { status: 400 })
    }

    // Check if a member
    const membership = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: session.user.id,
          channelId,
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this channel' }, { status: 400 })
    }

    // Leave the channel
    await prisma.channelMember.delete({
      where: {
        userId_channelId: {
          userId: session.user.id,
          channelId,
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error leaving channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
