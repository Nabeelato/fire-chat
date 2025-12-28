"use client"

import { useState, useEffect, useCallback } from "react"
import { useChatStore, Channel, DirectConversation } from "@/stores/chat-store"
import { useSocketStore } from "@/stores/socket-store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Hash, 
  Lock, 
  Plus, 
  ChevronDown,
  ChevronRight,
  Flame,
  LogOut
} from "lucide-react"
import { CreateChannelDialog } from "./create-channel-dialog"
import { NewDMDialog } from "./new-dm-dialog"
import { getInitials, cn } from "@/lib/utils"
import { signOut } from "next-auth/react"

export function Sidebar() {
  const { 
    channels, 
    activeChannel, 
    setActiveChannel,
    directConversations,
    setDirectConversations,
    activeDirectConversation,
    setActiveDirectConversation,
    currentUser,
    onlineUsers,
  } = useChatStore()
  
  const { emit } = useSocketStore()

  const [channelsExpanded, setChannelsExpanded] = useState(true)
  const [dmsExpanded, setDmsExpanded] = useState(true)
  const [createChannelOpen, setCreateChannelOpen] = useState(false)
  const [newDMOpen, setNewDMOpen] = useState(false)

  const fetchDirectConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/direct-messages")
      if (res.ok) {
        const conversations = await res.json()
        setDirectConversations(conversations)
      }
    } catch (error) {
      console.error("Error fetching DM conversations:", error)
    }
  }, [setDirectConversations])

  useEffect(() => {
    fetchDirectConversations()
  }, [fetchDirectConversations])

  const handleChannelSelect = (channel: Channel) => {
    // Leave previous channel room
    if (activeChannel) {
      emit("channel:leave", activeChannel.id)
    }
    
    // Join new channel room
    emit("channel:join", channel.id)
    setActiveChannel(channel)
  }

  const handleDMSelect = (conversation: DirectConversation) => {
    setActiveDirectConversation(conversation)
  }

  const isUserOnline = (userId: string) => onlineUsers.has(userId)

  return (
    <div className="w-64 bg-gray-800 flex flex-col border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-500" />
          <h1 className="font-bold text-lg">Fire Chat</h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Channels Section */}
          <div className="mb-4">
            <button
              onClick={() => setChannelsExpanded(!channelsExpanded)}
              className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-gray-400 hover:text-white"
            >
              <div className="flex items-center gap-1">
                {channelsExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>Channels</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation()
                  setCreateChannelOpen(true)
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </button>

            {channelsExpanded && (
              <div className="mt-1 space-y-0.5">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-gray-700 transition-colors",
                      activeChannel?.id === channel.id
                        ? "bg-gray-700 text-white"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    {channel.type === "private" ? (
                      <Lock className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <Hash className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{channel.name}</span>
                  </button>
                ))}

                {channels.length === 0 && (
                  <p className="text-xs text-gray-500 px-2 py-1">
                    No channels yet. Create one!
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Direct Messages Section */}
          <div>
            <button
              onClick={() => setDmsExpanded(!dmsExpanded)}
              className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-gray-400 hover:text-white"
            >
              <div className="flex items-center gap-1">
                {dmsExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>Direct Messages</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation()
                  setNewDMOpen(true)
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </button>

            {dmsExpanded && (
              <div className="mt-1 space-y-0.5">
                {directConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleDMSelect(conversation)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-gray-700 transition-colors",
                      activeDirectConversation?.id === conversation.id
                        ? "bg-gray-700 text-white"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={conversation.user.avatar || undefined} />
                        <AvatarFallback className="text-xs bg-gray-600">
                          {getInitials(conversation.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {isUserOnline(conversation.user.id) && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-gray-800" />
                      )}
                    </div>
                    <span className="truncate">{conversation.user.name}</span>
                  </button>
                ))}

                {directConversations.length === 0 && (
                  <p className="text-xs text-gray-500 px-2 py-1">
                    No conversations yet
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* User section */}
      <div className="p-3 border-t border-gray-700 bg-gray-850">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser?.avatar || undefined} />
              <AvatarFallback className="bg-orange-600">
                {currentUser ? getInitials(currentUser.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-800" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name}</p>
            <p className="text-xs text-gray-400 truncate">Online</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-gray-700"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <CreateChannelDialog open={createChannelOpen} onOpenChange={setCreateChannelOpen} />
      <NewDMDialog open={newDMOpen} onOpenChange={setNewDMOpen} />
    </div>
  )
}
