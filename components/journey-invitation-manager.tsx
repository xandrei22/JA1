"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCallback, useEffect, useState } from "react"

type JourneyInvitation = {
  id: string
  invitedEmail: string
  ageGroup: string
  status: "pending" | "accepted" | "declined"
  createdAt: string
}

const ageGroupOptions = ["AK", "AY", "AP", "AMW", "AS"]

export function JourneyInvitationManager() {
  const [invitedEmail, setInvitedEmail] = useState("")
  const [ageGroup, setAgeGroup] = useState("AY")
  const [message, setMessage] = useState("Create invitation for a member to access Journey.")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invitations, setInvitations] = useState<JourneyInvitation[]>([])

  const loadSentInvitations = useCallback(async () => {
    const response = await fetch("/api/journey/invitations?scope=sent", {
      method: "GET",
    })

    const payload = (await response.json().catch(() => ({}))) as {
      invitations?: JourneyInvitation[]
      error?: string
    }

    if (!response.ok) {
      setMessage(payload.error ?? "Failed to load sent invitations.")
      return
    }

    setInvitations(payload.invitations ?? [])
  }, [])

  useEffect(() => {
    void loadSentInvitations()
  }, [loadSentInvitations])

  async function createInvitation() {
    if (!invitedEmail.trim()) {
      setMessage("Invite email is required.")
      return
    }

    setIsSubmitting(true)
    setMessage("Creating invitation...")

    const response = await fetch("/api/journey/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitedEmail: invitedEmail.trim().toLowerCase(),
        ageGroup,
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
    }

    setIsSubmitting(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Failed to create invitation.")
      return
    }

    setInvitedEmail("")
    setMessage("Invitation created.")
    await loadSentInvitations()
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold">Journey Invitation Manager</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Invite members to Journey by age-group. Only matching age-group members can accept.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <p className="mb-1 text-sm font-medium">Member Email</p>
          <Input
            value={invitedEmail}
            onChange={(event) => setInvitedEmail(event.target.value)}
            placeholder="member@email.com"
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Age Group</p>
          <select
            value={ageGroup}
            onChange={(event) => setAgeGroup(event.target.value)}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            {ageGroupOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="button" className="mt-4" onClick={() => void createInvitation()} disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Invitation"}
      </Button>

      <p className="mt-3 text-sm text-muted-foreground">{message}</p>

      <div className="mt-5">
        <h4 className="font-medium">Sent Invitations</h4>
        {invitations.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No invitations sent yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {invitations.slice(0, 10).map((invitation) => (
              <div key={invitation.id} className="rounded-md border p-3 text-sm">
                <p>
                  <span className="font-medium">Email:</span> {invitation.invitedEmail}
                </p>
                <p>
                  <span className="font-medium">Age Group:</span> {invitation.ageGroup}
                </p>
                <p className="text-muted-foreground">
                  {invitation.status} · {new Date(invitation.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
