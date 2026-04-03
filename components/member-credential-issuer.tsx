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
      setMessage("Please enter a member ID, email, or member number.")
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
      let errorMsg = payload.error ?? "Failed to issue credential."
      if (response.status === 404) {
        errorMsg = `Member not found: "${normalizedMemberId}". Make sure the member ID, email, or member number is correct.`
      } else if (response.status === 500) {
        errorMsg = `Server error: ${payload.error ?? "Failed to create credential"}. Check the server logs.`
      }
      setMessage(errorMsg)
      return
    }

    setCredential(payload as CredentialResponse)
    setMessage("✓ Credential issued successfully! Share the backup code with the member.")
  }

  return (
    <div id="member-management" className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold">Member Credential Issuer</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate a QR code backup code for a member to use for manual attendance entry.
      </p>

      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
        <p className="font-medium">How to use:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Enter the member&apos;s ID, email, or member number</li>
          <li>The backup code will be displayed (format: JA1-BRANCH-YEAR-XXXX)</li>
          <li>Share this code with the member for manual attendance entry</li>
        </ul>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Member ID / Email / Number</p>
          <Input
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            placeholder="e.g. john@example.com or member-001"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Accept member ID (UUID), email address, or member number
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Branch Code</p>
          <Input
            value={activeBranch}
            onChange={(event) => setActiveBranch(event.target.value)}
            placeholder="e.g. DMNTY"
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
          <div className="rounded bg-yellow-50 p-2 dark:bg-yellow-900/20">
            <p className="font-medium text-yellow-900 dark:text-yellow-200">Backup Code (Share with member):</p>
            <p className="mt-1 break-all font-mono text-lg font-bold text-yellow-800 dark:text-yellow-100">{credential.backupCode}</p>
          </div>
          <p><span className="font-medium">Generated:</span> {new Date(credential.generatedAt).toLocaleString()}</p>
        </div>
      ) : null}
    </div>
  )
}
