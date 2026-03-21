"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"

type Branch = { branchCode: string; name: string; address: string; leader: string }

export function BranchBackupGenerator({ branchCode }: { branchCode: string }) {
  const [activeBranch, setActiveBranch] = useState(branchCode)
  const [isLoading, setIsLoading] = useState(false)
  const [backupCode, setBackupCode] = useState("")
  const [message, setMessage] = useState("Generate backup attendance code for branch operations.")

  const [branches, setBranches] = useState<Branch[]>([])
  const [pendingRequests, setPendingRequests] = useState<Partial<Branch & { id?: string; requestedBy?: string; status?: string }>[] | null>(null)
  const [newName, setNewName] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newLeader, setNewLeader] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/me")
        const j = await res.json().catch(() => ({}))
        setUserRole(j?.role ?? null)
        setIsSuperAdmin(j?.role === "vip_chairman")
      } catch (err) {
        // ignore
      }
    }
    loadMe()
  }, [])

  const canRequestBranch = isSuperAdmin || userRole === "branch_admin" || userRole === "supervising_pastor"

  async function fetchBranches() {
    try {
      const res = await fetch("/api/branch")
      const data = await res.json().catch(() => ({}))
      if (data?.persisted === false) {
        setBranches([])
        setPendingRequests([])
        return
      }
      setBranches(data.records ?? [])
      if (Array.isArray(data.pendingRequests)) setPendingRequests(data.pendingRequests)
      else setPendingRequests([])
    } catch (err) {
      setBranches([])
      setPendingRequests([])
    }
  }

  function generateBranchCode(name: string) {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 20)
  }

  async function createBranch(e?: React.FormEvent) {
    e?.preventDefault()
    setCreateError(null)
    const name = newName.trim()
    const address = newAddress.trim()
    const leader = newLeader.trim()
    if (!name || !address || !leader) {
      setCreateError("All fields are required")
      return
    }
    const code = generateBranchCode(name)
    setCreating(true)
    try {
      const res = await fetch("/api/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchCode: code, name, address, leader }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const serverMsg = json?.message ?? json?.error ?? null
        const serverHint = json?.hint ?? null
        const combined = [serverMsg, serverHint].filter(Boolean).join(" ")
        if (typeof combined === "string" && combined.includes("branch_requests")) {
          setCreateError(
            "Branch requests are not enabled on this server. Ask an administrator to run the DB migration or have a super admin create the branch."
          )
        } else {
          setCreateError(json?.error ?? "Failed to create branch")
        }
      } else {
        // If super admin created branch, backend returns record; otherwise a pending request
        if (json?.request) {
          setCreateError("Branch request submitted — pending super admin approval")
        } else {
          setCreateError(null)
        }
        setNewName("")
        setNewAddress("")
        setNewLeader("")
        fetchBranches()
      }
    } catch (err) {
      setCreateError("Network error")
    } finally {
      setCreating(false)
    }
  }


  const [approving, setApproving] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  async function approveRequest(branchCode: string) {
    if (!confirm(`Approve branch request for ${branchCode}?`)) return
    setApproving(branchCode)
    try {
      const res = await fetch("/api/branch/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchCode }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCreateError(j?.error ?? "Failed to approve request")
      } else {
        setCreateError(null)
        setInfoMessage("Branch approved")
        fetchBranches()
        setTimeout(() => setInfoMessage(null), 4000)
      }
    } catch (err) {
      setCreateError("Network error")
    } finally {
      setApproving(null)
    }
  }

  async function rejectRequest(branchCode: string) {
    const reason = window.prompt("Reason for rejection (optional):") ?? ""
    if (!confirm(`Reject branch request for ${branchCode}?`)) return
    setApproving(branchCode)
    try {
      const res = await fetch("/api/branch/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchCode, reason }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCreateError(j?.error ?? "Failed to reject request")
      } else {
        setCreateError(null)
        setInfoMessage("Branch request rejected")
        fetchBranches()
        setTimeout(() => setInfoMessage(null), 4000)
      }
    } catch (err) {
      setCreateError("Network error")
    } finally {
      setApproving(null)
    }
  }
  async function handleGenerate() {
    setIsLoading(true)
    setMessage("Generating backup code...")

    const response = await fetch("/api/attendance/backup-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ branchCode: activeBranch.trim() || branchCode }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      backupCode?: string
    }

    setIsLoading(false)

    if (!response.ok || !payload.backupCode) {
      setMessage(payload.error ?? "Failed to generate backup code.")
      return
    }

    setBackupCode(payload.backupCode)
    setMessage("Backup code generated.")
  }

  return (
    <div id="branch-management" className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold">Branch Backup Code Generator</h3>
      <p className="mt-1 text-sm text-muted-foreground">Generate manual attendance fallback code for branch services.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Branch Code</p>
          <Input value={activeBranch} onChange={(event) => setActiveBranch(event.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate Code"}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      {backupCode ? (
        <p className="mt-2 rounded-md border bg-muted/30 px-3 py-2 font-medium">{backupCode}</p>
      ) : null}

      <div className="mt-6">
        <h4 className="text-md font-medium">Register Branch</h4>
        {canRequestBranch ? (
          <form onSubmit={createBranch} className="mt-2 flex flex-col gap-2">
            <Input placeholder="Branch Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="Complete Address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
            <Input placeholder="Church Leader" value={newLeader} onChange={(e) => setNewLeader(e.target.value)} />
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={creating}>{creating ? (isSuperAdmin ? "Creating..." : "Requesting...") : (isSuperAdmin ? "Create Branch" : "Request Branch")}</Button>
              {createError && <div className="text-sm text-red-600">{createError}</div>}
            </div>
          </form>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">Only administrators (Supervising Pastor or Branch Admin) can request branch registration. Contact your supervising pastor or a branch admin to submit a request to the super admin.</div>
        )}

        {infoMessage ? (
          <div className="mt-3 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">{infoMessage}</div>
        ) : null}

        {isSuperAdmin && pendingRequests && pendingRequests.length > 0 ? (
          <div className="mt-6">
            <h4 className="text-md font-medium">Pending Branch Requests</h4>
            <div className="mt-2 overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2">Branch Name</th>
                    <th className="px-3 py-2">Branch Code</th>
                    <th className="px-3 py-2">Leader</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((r) => (
                    <tr key={(r as any).id ?? r.branchCode} className="border-t align-top">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.branchCode}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.leader}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.address}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={approving === r.branchCode}
                            onClick={() => approveRequest(r.branchCode ?? "")}
                          >
                            {approving === r.branchCode ? "Approving..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={approving === r.branchCode}
                            onClick={() => rejectRequest(r.branchCode ?? "")}
                          >
                            {approving === r.branchCode ? "Processing..." : "Reject"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <h4 className="text-md font-medium">Existing Branches</h4>
          <div className="mt-2 overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2">Branch Name</th>
                  <th className="px-3 py-2">Branch Code</th>
                  <th className="px-3 py-2">Leader</th>
                  <th className="px-3 py-2">Address</th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                      No branches found.
                    </td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr key={b.branchCode} className="border-t">
                      <td className="px-3 py-2 font-medium">{b.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{b.branchCode}</td>
                      <td className="px-3 py-2 text-muted-foreground">{b.leader}</td>
                      <td className="px-3 py-2 text-muted-foreground">{b.address}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
