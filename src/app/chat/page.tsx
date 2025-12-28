"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import { useChatStore } from "@/stores/chat-store"
import { useSocketStore } from "@/stores/socket-store"
import { Sidebar } from "@/components/chat/sidebar"
import { ChatArea } from "@/components/chat/chat-area"
import { UserPanel } from "@/components/chat/user-panel"
import { Loader2 } from "lucide-react"
import { redirect } from "next/navigation"

export default function ChatPage() {
  const { data: session, status } = useSession()
  const { setCurrentUser, setChannels, activeChannel, activeDirectConversation } = useChatStore()
  const { connect, disconnect } = useSocketStore()
  const [loading, setLoading] = useState(true)

  const fetchInitialData = useCallback(async () => {
    try {
      // Fetch channels
      const channelsRes = await fetch("/api/channels")
      if (channelsRes.ok) {
        const channels = await channelsRes.json()
        setChannels(channels)
      }
    } catch (error) {
      console.error("Error fetching initial data:", error)
    } finally {
      setLoading(false)
    }
  }, [setChannels])

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/auth/signin")
    }
  }, [status])

  useEffect(() => {
    if (session?.user) {
      setCurrentUser({
        id: session.user.id,
        name: session.user.name || "User",
        email: session.user.email || "",
        avatar: session.user.image,
        status: "online",
      })
      connect(session.user.id)
      fetchInitialData()
    }

    return () => {
      disconnect()
    }
  }, [session, setCurrentUser, connect, disconnect, fetchInitialData])

  if (status === "loading" || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {activeChannel || activeDirectConversation ? (
          <ChatArea />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-400 mb-2">
                Welcome to Fire Chat 🔥
              </h2>
              <p className="text-gray-500">
                Select a channel or start a conversation to begin chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User panel (right sidebar) */}
      {(activeChannel || activeDirectConversation) && <UserPanel />}
    </div>
  )
}
