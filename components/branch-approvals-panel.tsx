"use client"

import { Button } from "@/components/ui/button"
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

export function BranchApprovalsPanel() {
  const [requests, setRequests] = useState<BranchRecognitionRequest[]>([])
  const [message, setMessage] = useState("Load branch requests pending super admin approval.")
  const [isLoading, setIsLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setIsLoading(true)
    const response = await fetch("/api/branch/recognition?status=pending", { method: "GET" })
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      requests?: BranchRecognitionRequest[]
    }
    setIsLoading(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to load pending requests.")
      return
    }

    setRequests(payload.requests ?? [])
    setMessage("Pending requests loaded.")
  }, [])

  async function approveRequest(requestId: string) {
    setActionId(requestId)
    const response = await fetch(`/api/branch/recognition/${encodeURIComponent(requestId)}/approve`, {
      method: "POST",
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
    }

    setActionId(null)

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to approve request.")
      return
    }

    setMessage("Branch request approved.")
    await loadRequests()
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Super Admin Approvals</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor all branches and approve recognition requests.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={loadRequests} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{message}</p>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Requested By</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={5}>
                  No pending requests.
                </td>
              </tr>
            ) : (
              requests.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-3 py-2">{entry.branchCode}</td>
                  <td className="px-3 py-2">{entry.requestedByRole}</td>
                  <td className="px-3 py-2">{entry.note}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void approveRequest(entry.id)}
                      disabled={Boolean(actionId)}
                    >
                      {actionId === entry.id ? "Approving..." : "Approve"}
                    </Button>
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
