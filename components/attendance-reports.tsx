"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCallback, useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

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
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)
  const [message, setMessage] = useState("Loading attendance logs...")
  const [isPersisted, setIsPersisted] = useState(false)

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    setMessage("Loading attendance logs...")
    const params = new URLSearchParams({
      branchCode,
      limit: "100",
    })

    if (eventFilter.trim()) params.set("event", eventFilter.trim())
    if (startDate) params.set("start", startDate)
    if (endDate) params.set("end", endDate)
    if (startTime) params.set("startTime", startTime)
    if (endTime) params.set("endTime", endTime)

    const response = await fetch(`/api/attendance/log?${params.toString()}`, {
      method: "GET",
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      records?: AttendanceRecord[]
      note?: string
      persisted?: boolean
    }

    setIsLoading(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Failed to load attendance logs.")
      setIsPersisted(false)
      return
    }

    const recordCount = (payload.records ?? []).length
    setRecords(payload.records ?? [])
    setIsPersisted(payload.persisted ?? false)

    if (recordCount === 0) {
      setMessage("✓ No attendance records found for the selected period.")
    } else {
      const sourceNote = payload.persisted ? "(synced from Supabase)" : "(cached from local storage)"
      setMessage(
        `✓ ${recordCount} attendance record${recordCount === 1 ? "" : "s"} loaded ${sourceNote}.`
      )
    }
  }, [branchCode, eventFilter, startDate, endDate, startTime, endTime])

  // Load initial data on mount
  useEffect(() => {
    loadRecords()
  }, [branchCode])

  const downloadReport = useCallback(
    async (format: "csv" | "excel" | "pdf") => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ branchCode, limit: "10000", export: format })
        if (eventFilter.trim()) params.set("event", eventFilter.trim())
        if (startDate) params.set("start", startDate)
        if (endDate) params.set("end", endDate)
        if (startTime) params.set("startTime", startTime)
        if (endTime) params.set("endTime", endTime)

        const res = await fetch(`/api/attendance/log?${params.toString()}`)
        if (!res.ok) {
          const txt = await res.text().catch(() => "Failed to download")
          setMessage(txt)
          return
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url

        // Set appropriate filename and content type based on format
        const fileExtensions: Record<string, string> = {
          csv: "csv",
          excel: "xlsx",
          pdf: "pdf",
        }
        a.download = `attendance-${branchCode}.${fileExtensions[format]}`

        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setMessage(`${format.toUpperCase()} download started.`)
      } catch (err: any) {
        setMessage(err?.message ?? `Failed to download ${format.toUpperCase()}`)
      } finally {
        setIsLoading(false)
      }
    },
    [branchCode, eventFilter, startDate, endDate, startTime, endTime]
  )

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
        <div>
          <p className="mb-1 text-sm font-medium">Start Date</p>
          <Input type="date" value={startDate ?? ""} onChange={(e) => setStartDate(e.target.value || null)} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">End Date</p>
          <Input type="date" value={endDate ?? ""} onChange={(e) => setEndDate(e.target.value || null)} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Start Time</p>
          <Input type="time" value={startTime ?? ""} onChange={(e) => setStartTime(e.target.value || null)} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">End Time</p>
          <Input type="time" value={endTime ?? ""} onChange={(e) => setEndTime(e.target.value || null)} />
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{message}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={loadRecords} disabled={isLoading}>
            {isLoading ? "Loading..." : "Refresh Logs"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" disabled={isLoading}>
                Download <ChevronDown className="ml-2 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => downloadReport("csv")}>
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadReport("excel")}>
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadReport("pdf")}>
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="ml-auto">
          <Input placeholder="Search events..." value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} />
        </div>
      </div>

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
