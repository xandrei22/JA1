"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCallback, useState } from "react"

type AttendanceRecord = {
  memberId: string
  eventCode: string
  branchCode: string
  method: "qr" | "manual"
  loggedAt: string
}

export function AttendanceReports({ branchCode }: { branchCode: string }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [eventFilter, setEventFilter] = useState("")
  const [message, setMessage] = useState("Load recent attendance logs.")

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    setMessage("Loading attendance logs...")

    const params = new URLSearchParams({
      branchCode,
      limit: "30",
    })

    const response = await fetch(`/api/attendance/log?${params.toString()}`, {
      method: "GET",
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      records?: AttendanceRecord[]
      note?: string
    }

    setIsLoading(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Failed to load attendance logs.")
      return
    }

    setRecords(payload.records ?? [])
    setMessage(
      payload.note ?? `Loaded ${(payload.records ?? []).length} attendance logs.`
    )
  }, [branchCode])

  const filtered = records.filter((record) =>
    eventFilter.trim()
      ? record.eventCode.toLowerCase().includes(eventFilter.trim().toLowerCase())
      : true
  )

  return (
    <div id="attendance-view" className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <h3 className="text-lg font-semibold">Attendance Reports</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            View recent attendance logs for your branch.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={loadRecords} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh Logs"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Branch Code</p>
          <Input value={branchCode} readOnly />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Filter by Event Code</p>
          <Input
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value)}
            placeholder="e.g. SUNDAY-SERVICE"
          />
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{message}</p>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2">Member ID</th>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Logged At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                  No logs yet.
                </td>
              </tr>
            ) : (
              filtered.map((record, index) => (
                <tr key={`${record.memberId}-${record.loggedAt}-${index}`} className="border-t">
                  <td className="px-3 py-2">{record.memberId}</td>
                  <td className="px-3 py-2">{record.eventCode}</td>
                  <td className="px-3 py-2 uppercase">{record.method}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(record.loggedAt).toLocaleString()}
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
