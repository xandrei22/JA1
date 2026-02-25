"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type JourneyInvitation = {
  id: string
  invitedEmail: string
  ageGroup: string
  invitedByRole: string
  status: "pending" | "accepted" | "declined"
  createdAt: string
}

type JourneyMembership = {
  id: string
  userEmail: string
  ageGroup: string
  invitationId: string
  joinedAt: string
}

export function JourneyAccessPanel({ hasDirectAccess = false }: { hasDirectAccess?: boolean }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAcceptingId, setIsAcceptingId] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<JourneyInvitation[]>([])
  const [membership, setMembership] = useState<JourneyMembership | null>(null)
  const [message, setMessage] = useState("Loading journey data...")

  const loadData = useCallback(async () => {
    setIsLoading(true)

    const response = await fetch("/api/journey/invitations?scope=mine", {
      method: "GET",
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      invitations?: JourneyInvitation[]
      membership?: JourneyMembership | null
    }

    setIsLoading(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to load journey invitations.")
      return
    }

    setInvitations(payload.invitations ?? [])
    setMembership(payload.membership ?? null)
    setMessage("Journey data updated.")
  }, [])

  useEffect(() => {
    if (hasDirectAccess) {
      setIsLoading(false)
      setMessage("Direct Journey access is enabled for your role.")
      return
    }

    void loadData()
  }, [hasDirectAccess, loadData])

  async function acceptInvitation(invitationId: string) {
    setIsAcceptingId(invitationId)

    const response = await fetch(
      `/api/journey/invitations/${encodeURIComponent(invitationId)}/accept`,
      { method: "POST" }
    )

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      membership?: JourneyMembership
    }

    setIsAcceptingId(null)

    if (!response.ok) {
      setMessage(payload.error ?? "Failed to accept invitation.")
      return
    }

    setMembership(payload.membership ?? null)
    setMessage("Invitation accepted. You can now open Journey.")
    await loadData()
  }

  const pending = invitations.filter((entry) => entry.status === "pending")

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold">Journey Access</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasDirectAccess
          ? "Your leadership role already has Journey access."
          : "You can join Journey only after accepting a valid invitation for your age-group."}
      </p>

      {hasDirectAccess ? (
        <div className="mt-4 rounded-lg border p-3 text-sm">
          <p>
            <span className="font-medium">Access Mode:</span> Direct (no invitation required)
          </p>
          <Button type="button" className="mt-3" asChild>
            <Link href="/journey">Open Journey</Link>
          </Button>
        </div>
      ) : null}

      {membership && !hasDirectAccess ? (
        <div className="mt-4 rounded-lg border p-3 text-sm">
          <p>
            <span className="font-medium">Joined Group:</span> {membership.ageGroup}
          </p>
          <p className="mt-1 text-muted-foreground">
            Joined at {new Date(membership.joinedAt).toLocaleString()}
          </p>
          <Button type="button" className="mt-3" asChild>
            <Link href="/journey">Open Journey</Link>
          </Button>
        </div>
      ) : !hasDirectAccess ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No active Journey membership yet.
        </p>
      ) : null}

      {!hasDirectAccess ? (
      <div className="mt-5">
        <h4 className="font-medium">Pending Invitations</h4>
        {isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        ) : pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {pending.map((invitation) => (
              <div key={invitation.id} className="rounded-md border p-3 text-sm">
                <p>
                  <span className="font-medium">Group:</span> {invitation.ageGroup}
                </p>
                <p className="text-muted-foreground">
                  Invited by {invitation.invitedByRole} · {new Date(invitation.createdAt).toLocaleString()}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2"
                  onClick={() => void acceptInvitation(invitation.id)}
                  disabled={Boolean(isAcceptingId)}
                >
                  {isAcceptingId === invitation.id ? "Accepting..." : "Accept Invitation"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      ) : null}

      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
