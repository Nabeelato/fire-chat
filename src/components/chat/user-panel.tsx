"use client"

import { useState, useEffect, useCallback } from "react"
import { useChatStore, User } from "@/stores/chat-store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users } from "lucide-react"
import { getInitials, cn } from "@/lib/utils"

interface ChannelMember extends User {
  role: string
  joinedAt: string
}

export function UserPanel() {
  const { 
    activeChannel, 
    activeDirectConversation,
    onlineUsers 
  } = useChatStore()

  const [members, setMembers] = useState<ChannelMember[]>([])
  const [loading, setLoading] = useState(false)

  const fetchChannelMembers = useCallback(async () => {
    if (!activeChannel) return
    setLoading(true)
    try {
      const res = await fetch(`/api/channels/${activeChannel.id}/members`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data)
      }
    } catch (error) {
      console.error("Error fetching members:", error)
    } finally {
      setLoading(false)
    }
  }, [activeChannel])

  useEffect(() => {
    if (activeChannel) {
      fetchChannelMembers()
    }
  }, [activeChannel, fetchChannelMembers])

  const isUserOnline = (userId: string) => onlineUsers.has(userId)

  // For DMs, show user info
  if (activeDirectConversation) {
    const user = activeDirectConversation.user
    return (
      <div className="w-60 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-semibold text-sm text-gray-400">User Info</h3>
        </div>
        
        <div className="p-4 flex flex-col items-center text-center">
          <Avatar className="w-20 h-20 mb-3">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="text-2xl bg-orange-600">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-lg">{user.name}</h3>
          <p className="text-sm text-gray-400">{user.email}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className={cn(
              "w-2 h-2 rounded-full",
              isUserOnline(user.id) ? "bg-green-500" : "bg-gray-500"
            )} />
            <span className="text-xs text-gray-400">
              {isUserOnline(user.id) ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // For channels, show member list
  const onlineMembers = members.filter(m => isUserOnline(m.id))
  const offlineMembers = members.filter(m => !isUserOnline(m.id))

  return (
    <div className="w-60 bg-gray-800 border-l border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-sm">Members</h3>
          <span className="text-xs text-gray-500">({members.length})</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
          ) : (
            <>
              {/* Online Members */}
              {onlineMembers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 px-2 mb-2">
                    ONLINE — {onlineMembers.length}
                  </h4>
                  {onlineMembers.map((member) => (
                    <MemberItem key={member.id} member={member} isOnline={true} />
                  ))}
                </div>
              )}

              {/* Offline Members */}
              {offlineMembers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 px-2 mb-2">
                    OFFLINE — {offlineMembers.length}
                  </h4>
                  {offlineMembers.map((member) => (
                    <MemberItem key={member.id} member={member} isOnline={false} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function MemberItem({ member, isOnline }: { member: ChannelMember; isOnline: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700 cursor-pointer">
      <div className="relative">
        <Avatar className="w-8 h-8">
          <AvatarImage src={member.avatar || undefined} />
          <AvatarFallback className="text-xs bg-gray-600">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-800",
          isOnline ? "bg-green-500" : "bg-gray-500"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm truncate",
          !isOnline && "text-gray-400"
        )}>
          {member.name}
          {member.role === "admin" && (
            <span className="ml-1 text-xs text-orange-500">👑</span>
          )}
        </p>
      </div>
    </div>
  )
}
