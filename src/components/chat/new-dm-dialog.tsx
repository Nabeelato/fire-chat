"use client"

import { useState, useEffect, useCallback } from "react"
import { useChatStore, User, DirectConversation } from "@/stores/chat-store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Loader2 } from "lucide-react"
import { getInitials, cn } from "@/lib/utils"

interface NewDMDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewDMDialog({ open, onOpenChange }: NewDMDialogProps) {
  const { 
    setActiveDirectConversation, 
    addDirectConversation,
    onlineUsers 
  } = useChatStore()

  const [search, setSearch] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      
      const res = await fetch(`/api/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open, fetchUsers])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (open) {
        fetchUsers()
      }
    }, 300)

    return () => clearTimeout(debounce)
  }, [search, open, fetchUsers])

  const handleSelectUser = (user: User) => {
    const conversation: DirectConversation = {
      id: user.id,
      user,
      unreadCount: 0,
    }
    
    addDirectConversation(conversation)
    setActiveDirectConversation(conversation)
    handleClose()
  }

  const handleClose = () => {
    setSearch("")
    onOpenChange(false)
  }

  const isUserOnline = (userId: string) => onlineUsers.has(userId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription className="text-gray-400">
            Start a conversation with someone
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-10 bg-gray-900 border-gray-600"
              autoFocus
            />
          </div>

          {/* User List */}
          <ScrollArea className="h-64">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {search ? "No users found" : "No users available"}
              </p>
            ) : (
              <div className="space-y-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback className="bg-gray-600">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {isUserOnline(user.id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                    <span className={cn(
                      "text-xs",
                      isUserOnline(user.id) ? "text-green-500" : "text-gray-500"
                    )}>
                      {isUserOnline(user.id) ? "Online" : "Offline"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
