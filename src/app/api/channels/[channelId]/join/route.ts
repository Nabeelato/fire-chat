import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/channels/[channelId]/join - Join a channel
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

    // Can only join public channels directly
    if (channel.type === 'private') {
      return NextResponse.json({ error: 'Cannot join private channel directly' }, { status: 403 })
    }

    // Check if already a member
    const existingMembership = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: session.user.id,
          channelId,
        }
      }
    })

    if (existingMembership) {
      return NextResponse.json({ error: 'Already a member of this channel' }, { status: 400 })
    }

    // Join the channel
    await prisma.channelMember.create({
      data: {
        userId: session.user.id,
        channelId,
        role: 'member'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error joining channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
