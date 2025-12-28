"use client"

import { useState } from "react"
import { useChatStore } from "@/stores/chat-store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Hash, Lock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateChannelDialog({ open, onOpenChange }: CreateChannelDialogProps) {
  const { addChannel, setActiveChannel } = useChatStore()
  
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"public" | "private">("public")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Channel name is required")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim().toLowerCase().replace(/\s+/g, "-"),
          description: description.trim() || null,
          type,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create channel")
        return
      }

      addChannel(data)
      setActiveChannel(data)
      handleClose()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setType("public")
    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Create a Channel</DialogTitle>
          <DialogDescription className="text-gray-400">
            Channels are where your team communicates. They&apos;re best when organized around a topic.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Channel Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("public")}
                className={cn(
                  "flex-1 flex items-center gap-2 p-3 rounded-lg border transition-colors",
                  type === "public"
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-gray-600 hover:border-gray-500"
                )}
              >
                <Hash className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Public</p>
                  <p className="text-xs text-gray-400">Anyone can join</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType("private")}
                className={cn(
                  "flex-1 flex items-center gap-2 p-3 rounded-lg border transition-colors",
                  type === "private"
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-gray-600 hover:border-gray-500"
                )}
              >
                <Lock className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Private</p>
                  <p className="text-xs text-gray-400">Invite only</p>
                </div>
              </button>
            </div>
          </div>

          {/* Channel Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Channel Name
            </label>
            <div className="flex items-center gap-2 bg-gray-900 rounded-md px-3">
              {type === "public" ? (
                <Hash className="w-4 h-4 text-gray-400" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. marketing"
                className="border-none bg-transparent focus-visible:ring-0"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="bg-gray-900 border-gray-600"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Channel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
