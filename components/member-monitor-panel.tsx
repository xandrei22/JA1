"use client"

import { Button } from "@/components/ui/button"
import { useCallback, useState } from "react"

type MonitoringMember = {
  id: string
  name: string
  email: string
  branchCode: string | null
  ageGroup: string | null
  age: number | null
}

type AgeComplianceViolation = {
  memberId: string
  memberEmail: string
  declaredAgeGroup: string | null
  expectedAgeGroup: string
  age: number
}

type Snapshot = {
  scope: "own_group" | "branch" | "all_branches"
  members: MonitoringMember[]
  groupCounts: Record<string, number>
  branchCounts: Record<string, number>
  complianceViolations: AgeComplianceViolation[]
  note?: string
}

export function MemberMonitorPanel({
  canViewCompliance,
}: {
  canViewCompliance: boolean
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("Load monitoring data.")

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setMessage("Loading member monitoring data...")

    const response = await fetch("/api/members/monitor", {
      method: "GET",
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
    } & Partial<Snapshot>

    setIsLoading(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to load monitoring data.")
      return
    }

    const nextSnapshot: Snapshot = {
      scope: (payload.scope as Snapshot["scope"]) ?? "own_group",
      members: payload.members ?? [],
      groupCounts: payload.groupCounts ?? {},
      branchCounts: payload.branchCounts ?? {},
      complianceViolations: payload.complianceViolations ?? [],
      note: payload.note,
    }

    setSnapshot(nextSnapshot)
    setMessage(nextSnapshot.note ?? "Monitoring data loaded.")
  }, [])

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Member Monitoring</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Leader sees own group only, chairman/pastor sees branch, super admin sees all branches.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={loadData} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{message}</p>

      {snapshot ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Scope</p>
              <p className="font-medium uppercase">{snapshot.scope.replace("_", " ")}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="font-medium">{snapshot.members.length}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Compliance Issues</p>
              <p className="font-medium">{snapshot.complianceViolations.length}</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Branch</th>
                  <th className="px-3 py-2">Age Group</th>
                  <th className="px-3 py-2">Age</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.members.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={5}>
                      No members found for your scope.
                    </td>
                  </tr>
                ) : (
                  snapshot.members.slice(0, 100).map((member) => (
                    <tr key={member.id} className="border-t">
                      <td className="px-3 py-2">{member.name}</td>
                      <td className="px-3 py-2">{member.email}</td>
                      <td className="px-3 py-2">{member.branchCode ?? "N/A"}</td>
                      <td className="px-3 py-2">{member.ageGroup ?? "N/A"}</td>
                      <td className="px-3 py-2">{member.age ?? "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {canViewCompliance ? (
            <div className="mt-5">
              <h4 className="font-medium">Age Group Compliance</h4>
              <div className="mt-2 overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2">Member Email</th>
                      <th className="px-3 py-2">Age</th>
                      <th className="px-3 py-2">Declared Group</th>
                      <th className="px-3 py-2">Expected Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.complianceViolations.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                          No compliance issues found.
                        </td>
                      </tr>
                    ) : (
                      snapshot.complianceViolations.slice(0, 100).map((entry) => (
                        <tr key={entry.memberId} className="border-t">
                          <td className="px-3 py-2">{entry.memberEmail}</td>
                          <td className="px-3 py-2">{entry.age}</td>
                          <td className="px-3 py-2">{entry.declaredAgeGroup ?? "N/A"}</td>
                          <td className="px-3 py-2">{entry.expectedAgeGroup}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
