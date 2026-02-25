"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export function BranchBackupGenerator({ branchCode }: { branchCode: string }) {
  const [activeBranch, setActiveBranch] = useState(branchCode)
  const [isLoading, setIsLoading] = useState(false)
  const [backupCode, setBackupCode] = useState("")
  const [message, setMessage] = useState("Generate backup attendance code for branch operations.")

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
      <p className="mt-1 text-sm text-muted-foreground">
        Generate manual attendance fallback code for branch services.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Branch Code</p>
          <Input
            value={activeBranch}
            onChange={(event) => setActiveBranch(event.target.value)}
          />
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
    </div>
  )
}
