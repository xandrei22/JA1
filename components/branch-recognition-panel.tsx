"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCallback, useState } from "react"

type BranchRecognitionRequest = {
  id: string
  branchCode: string
  requestedByRole: string
  note: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  approvedAt: string | null
}

export function BranchRecognitionPanel({
  branchCode,
  canApproveBranches,
}: {
  branchCode: string
  canApproveBranches: boolean
}) {
  const [activeBranch, setActiveBranch] = useState(branchCode)
  const [branchName, setBranchName] = useState(`JA1 ${branchCode.toUpperCase()}`)
  const [note, setNote] = useState("")
  const [message, setMessage] = useState(
    canApproveBranches
      ? "VIP can directly create and approve branch recognition."
      : "Submit branch recognition request to super admin."
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requests, setRequests] = useState<BranchRecognitionRequest[]>([])

  const loadRequests = useCallback(async () => {
    const params = new URLSearchParams({ branchCode: activeBranch.trim() || branchCode })
    const response = await fetch(`/api/branch/recognition?${params.toString()}`, {
      method: "GET",
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      requests?: BranchRecognitionRequest[]
    }

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to load recognition requests.")
      return
    }

    setRequests(payload.requests ?? [])
  }, [activeBranch, branchCode])

  async function submitRequest() {
    if (!note.trim()) {
      setMessage("Recognition note is required.")
      return
    }

    setIsSubmitting(true)
    setMessage("Submitting request...")

    const response = await fetch("/api/branch/recognition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchCode: activeBranch.trim() || branchCode,
        branchName: branchName.trim() || `JA1 ${(activeBranch.trim() || branchCode).toUpperCase()}`,
        note: note.trim(),
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      message?: string
    }

    setIsSubmitting(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Failed to submit request.")
      return
    }

    const serverMessage =
      (payload.message ?? "") ||
      "Branch recognition request submitted and waiting for VIP approval."
    setMessage(serverMessage)
    setNote("")
    await loadRequests()
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold">Branch Recognition</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {canApproveBranches
          ? "VIP can create branches directly and approve recognition requests."
          : "Supervising pastor submits branch recognition for VIP approval."}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <p className="mb-1 text-sm font-medium">Branch Code</p>
          <Input value={activeBranch} onChange={(event) => setActiveBranch(event.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Branch Name</p>
          <Input
            value={branchName}
            onChange={(event) => setBranchName(event.target.value)}
            placeholder="e.g. JA1 Downtown"
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Recognition Note</p>
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why this branch is ready for recognition" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={() => void submitRequest()} disabled={isSubmitting}>
          {isSubmitting
            ? canApproveBranches
              ? "Creating..."
              : "Submitting..."
            : canApproveBranches
              ? "Create Branch"
              : "Submit Request"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void loadRequests()}>
          Refresh Requests
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{message}</p>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Approved</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                  No requests yet.
                </td>
              </tr>
            ) : (
              requests.slice(0, 50).map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-3 py-2">{entry.branchCode}</td>
                  <td className="px-3 py-2 uppercase">{entry.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {entry.approvedAt ? new Date(entry.approvedAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
