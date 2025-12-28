import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    })

    // Find or create default #general channel
    let generalChannel = await prisma.channel.findFirst({
      where: { name: "general" }
    })

    if (!generalChannel) {
      generalChannel = await prisma.channel.create({
        data: {
          name: "general",
          description: "General discussion",
          type: "public",
          creatorId: user.id,
        },
      })
    }

    // Add user to general channel if not already a member
    const existingMembership = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId: generalChannel.id,
        }
      }
    })

    if (!existingMembership) {
      await prisma.channelMember.create({
        data: {
          userId: user.id,
          channelId: generalChannel.id,
          role: "member",
        },
      })
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: "User created successfully",
      user: userWithoutPassword,
    })

  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
