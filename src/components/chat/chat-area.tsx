"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useChatStore, Message, DirectMessage } from "@/stores/chat-store"
import { useSocketStore } from "@/stores/socket-store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Hash, 
  Lock, 
  Send, 
  Paperclip, 
  Smile, 
  Phone,
  Video,
  Pin
} from "lucide-react"
import { formatDate, getInitials, cn } from "@/lib/utils"

export function ChatArea() {
  const {
    activeChannel,
    activeDirectConversation,
    messages,
    setMessages,
    addMessage,
    directMessages,
    setDirectMessages,
    addDirectMessage,
    currentUser,
    onlineUsers,
  } = useChatStore()
  
  const { emit, on, off } = useSocketStore()

  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchChannelMessages = useCallback(async () => {
    if (!activeChannel) return
    setLoading(true)
    try {
      const res = await fetch(`/api/channels/${activeChannel.id}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }, [activeChannel, setMessages])

  const fetchDirectMessages = useCallback(async () => {
    if (!activeDirectConversation) return
    setLoading(true)
    try {
      const res = await fetch(`/api/direct-messages/${activeDirectConversation.user.id}`)
      if (res.ok) {
        const data = await res.json()
        setDirectMessages(data.messages)
      }
    } catch (error) {
      console.error("Error fetching DMs:", error)
    } finally {
      setLoading(false)
    }
  }, [activeDirectConversation, setDirectMessages])

  useEffect(() => {
    if (activeChannel) {
      fetchChannelMessages()
    } else if (activeDirectConversation) {
      fetchDirectMessages()
    }
  }, [activeChannel, activeDirectConversation, fetchChannelMessages, fetchDirectMessages])

  useEffect(() => {
    const handleNewMessage = (data: unknown) => {
      const msg = data as Message
      if (activeChannel && msg.channelId === activeChannel.id) {
        addMessage(msg)
      }
    }

    const handleNewDM = (data: unknown) => {
      const msg = data as DirectMessage
      if (activeDirectConversation && 
          (msg.senderId === activeDirectConversation.user.id || 
           msg.receiverId === activeDirectConversation.user.id)) {
        addDirectMessage(msg)
      }
    }

    on("message:new", handleNewMessage)
    on("dm:new", handleNewDM)

    return () => {
      off("message:new", handleNewMessage)
      off("dm:new", handleNewDM)
    }
  }, [activeChannel, activeDirectConversation, addMessage, addDirectMessage, on, off])

  useEffect(() => {
    scrollToBottom()
  }, [messages, directMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser) return

    const content = message.trim()
    setMessage("")

    // Stop typing indicator immediately
    handleTypingStop()

    try {
      if (activeChannel) {
        // Create optimistic message (show immediately)
        const tempId = `temp-${Date.now()}`
        const optimisticMessage: Message = {
          id: tempId,
          content,
          userId: currentUser.id,
          channelId: activeChannel.id,
          type: 'text',
          timestamp: new Date().toISOString(),
          user: currentUser,
        }
        
        // Add message immediately (optimistic update)
        addMessage(optimisticMessage)

        // Send to server in background
        const res = await fetch(`/api/channels/${activeChannel.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        })

        if (res.ok) {
          const serverMessage = await res.json()
          // Replace temp message with server message (has real ID)
          // The duplicate check in store will handle this
          addMessage(serverMessage)
          
          // Broadcast via socket
          emit("message:send", {
            channelId: activeChannel.id,
            message: serverMessage,
          })
        }
      } else if (activeDirectConversation) {
        // Create optimistic DM
        const tempId = `temp-${Date.now()}`
        const optimisticDM: DirectMessage = {
          id: tempId,
          content,
          senderId: currentUser.id,
          receiverId: activeDirectConversation.user.id,
          type: 'text',
          timestamp: new Date().toISOString(),
          sender: currentUser,
        }
        
        // Add DM immediately
        addDirectMessage(optimisticDM)

        // Send to server in background
        const res = await fetch(`/api/direct-messages/${activeDirectConversation.user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        })

        if (res.ok) {
          const serverMessage = await res.json()
          addDirectMessage(serverMessage)
          
          // Broadcast via socket
          emit("dm:send", {
            receiverId: activeDirectConversation.user.id,
            message: serverMessage,
          })
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      // TODO: Could remove optimistic message or show error state
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTypingStart = () => {
    if (!isTyping && activeChannel && currentUser) {
      setIsTyping(true)
      emit("typing:start", {
        channelId: activeChannel.id,
        userId: currentUser.id,
        userName: currentUser.name,
      })
    }

    // Reset timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(handleTypingStop, 3000)
  }

  const handleTypingStop = () => {
    if (isTyping && activeChannel && currentUser) {
      setIsTyping(false)
      emit("typing:stop", {
        channelId: activeChannel.id,
        userId: currentUser.id,
      })
    }
  }

  const displayMessages = activeChannel ? messages : directMessages
  const title = activeChannel?.name || activeDirectConversation?.user.name || ""
  const isPrivate = activeChannel?.type === "private"

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="h-14 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {activeChannel ? (
            <>
              {isPrivate ? (
                <Lock className="w-5 h-5 text-gray-400" />
              ) : (
                <Hash className="w-5 h-5 text-gray-400" />
              )}
              <h2 className="font-semibold">{title}</h2>
              {activeChannel.description && (
                <span className="text-sm text-gray-400 ml-2 hidden md:block">
                  | {activeChannel.description}
                </span>
              )}
            </>
          ) : activeDirectConversation ? (
            <>
              <Avatar className="w-6 h-6">
                <AvatarImage src={activeDirectConversation.user.avatar || undefined} />
                <AvatarFallback className="text-xs bg-gray-600">
                  {getInitials(activeDirectConversation.user.name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="font-semibold">{title}</h2>
              {onlineUsers.has(activeDirectConversation.user.id) && (
                <span className="text-xs text-green-500">● Online</span>
              )}
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Pin className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-gray-500">Loading messages...</div>
          ) : displayMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg mb-2">No messages yet</p>
              <p className="text-sm">Be the first to send a message!</p>
            </div>
          ) : (
            displayMessages.map((msg, index) => {
              const isChannelMessage = "channelId" in msg
              const user = isChannelMessage 
                ? (msg as Message).user 
                : (msg as DirectMessage).sender
              const prevMsg = displayMessages[index - 1]
              const prevUser = prevMsg 
                ? ("channelId" in prevMsg ? (prevMsg as Message).user : (prevMsg as DirectMessage).sender)
                : null
              const showAvatar = !prevUser || prevUser?.id !== user?.id

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 hover:bg-gray-800/50 -mx-2 px-2 py-1 rounded",
                    !showAvatar && "mt-0.5"
                  )}
                >
                  {showAvatar ? (
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={user?.avatar || undefined} />
                      <AvatarFallback className="bg-orange-600">
                        {user ? getInitials(user.name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-10 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {showAvatar && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-semibold text-sm hover:underline cursor-pointer">
                          {user?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <p className="text-gray-200 break-words">{msg.content}</p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-4 py-2">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-8 w-8">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              handleTypingStart()
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${activeChannel ? `#${activeChannel.name}` : activeDirectConversation?.user.name || ""}`}
            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-8 w-8">
            <Smile className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="icon"
            className="bg-orange-500 hover:bg-orange-600 h-8 w-8"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
