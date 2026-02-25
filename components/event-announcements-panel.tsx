"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCallback, useState } from "react"

type Announcement = {
  id: string
  branchCode: string
  title: string
  message: string
  createdByRole: string
  createdAt: string
}

export function EventAnnouncementsPanel({
  branchCode,
  canManage,
}: {
  branchCode: string
  canManage: boolean
}) {
  const [activeBranch, setActiveBranch] = useState(branchCode)
  const [title, setTitle] = useState("")
  const [messageText, setMessageText] = useState("")
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [message, setMessage] = useState("Load branch announcements.")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadAnnouncements = useCallback(async () => {
    const params = new URLSearchParams({ branchCode: activeBranch.trim() || branchCode })
    const response = await fetch(`/api/events/announcements?${params.toString()}`, {
      method: "GET",
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      announcements?: Announcement[]
    }

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to load announcements.")
      return
    }

    setAnnouncements(payload.announcements ?? [])
    setMessage("Announcements updated.")
  }, [activeBranch, branchCode])

  async function createAnnouncement() {
    if (!title.trim() || !messageText.trim()) {
      setMessage("Title and message are required.")
      return
    }

    setIsSubmitting(true)

    const response = await fetch("/api/events/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchCode: activeBranch.trim() || branchCode,
        title: title.trim(),
        message: messageText.trim(),
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
    }

    setIsSubmitting(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to create announcement.")
      return
    }

    setTitle("")
    setMessageText("")
    setMessage("Announcement posted.")
    await loadAnnouncements()
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold">Event Announcements</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Supervising pastor posts branch events here. Members can read announcements in their scope.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Branch Code</p>
          <Input value={activeBranch} onChange={(event) => setActiveBranch(event.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={() => void loadAnnouncements()}>
            Refresh Announcements
          </Button>
        </div>
      </div>

      {canManage ? (
        <div className="mt-4 grid gap-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Announcement title"
          />
          <Input
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="Announcement message"
          />
          <div>
            <Button type="button" onClick={() => void createAnnouncement()} disabled={isSubmitting}>
              {isSubmitting ? "Posting..." : "Post Announcement"}
            </Button>
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-sm text-muted-foreground">{message}</p>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Message</th>
              <th className="px-3 py-2">By</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {announcements.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={5}>
                  No announcements yet.
                </td>
              </tr>
            ) : (
              announcements.slice(0, 50).map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-3 py-2">{entry.branchCode}</td>
                  <td className="px-3 py-2">{entry.title}</td>
                  <td className="px-3 py-2">{entry.message}</td>
                  <td className="px-3 py-2">{entry.createdByRole}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
