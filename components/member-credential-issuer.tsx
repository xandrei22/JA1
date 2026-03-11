"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

type CredentialResponse = {
  memberId: string
  branchCode: string
  qrToken: string
  qrPayload: string
  backupCode: string
  generatedAt: string
}

export function MemberCredentialIssuer({ branchCode }: { branchCode: string }) {
  const [memberId, setMemberId] = useState("")
  const [activeBranch, setActiveBranch] = useState(branchCode)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("Issue a new QR + backup credential for a member.")
  const [credential, setCredential] = useState<CredentialResponse | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch("/api/me")
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        setUserRole(json?.user?.role ?? null)
      } catch {
        // noop
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const canIssue = userRole === "vip_chairman" || userRole === "supervising_pastor"

  // Hide this component entirely for users who are not allowed to issue credentials.
  if (!canIssue) return null

  async function handleIssueCredential() {
    const normalizedMemberId = memberId.trim()

    if (!normalizedMemberId) {
      setMessage("Member ID is required.")
      return
    }

    setIsLoading(true)
    setMessage("Issuing credential...")

    const response = await fetch(`/api/members/${encodeURIComponent(normalizedMemberId)}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ branchCode: activeBranch.trim() || branchCode }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
    } & Partial<CredentialResponse>

    setIsLoading(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Failed to issue credential.")
      return
    }

    setCredential(payload as CredentialResponse)
    setMessage("Credential issued successfully.")
  }

  return (
    <div id="member-management" className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold">Member Credential Issuer</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate a fresh member QR payload with equivalent code for manual typing.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Member ID</p>
          <Input
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            placeholder="e.g. member-001"
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Branch Code</p>
          <Input
            value={activeBranch}
            onChange={(event) => setActiveBranch(event.target.value)}
            placeholder="e.g. DUM"
          />
        </div>
      </div>

      <div className="mt-4">
        <Button type="button" onClick={handleIssueCredential} disabled={isLoading || !canIssue}>
          {isLoading ? "Generating..." : "Issue Credential"}
        </Button>
        {!canIssue ? (
          <p className="mt-2 text-xs text-muted-foreground">Only VIP chairman or Supervising Pastor may issue credentials.</p>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{message}</p>

      {credential ? (
        <div className="mt-4 grid gap-2 rounded-lg border p-3 text-sm">
          <p><span className="font-medium">Member ID:</span> {credential.memberId}</p>
          <p><span className="font-medium">Branch:</span> {credential.branchCode}</p>
          <p><span className="font-medium">QR Token:</span> {credential.qrToken}</p>
          <p className="break-all"><span className="font-medium">QR Payload:</span> {credential.qrPayload}</p>
          <p><span className="font-medium">Equivalent Typed Code:</span> {credential.backupCode}</p>
          <p><span className="font-medium">Generated:</span> {new Date(credential.generatedAt).toLocaleString()}</p>
        </div>
      ) : null}
    </div>
  )
}
