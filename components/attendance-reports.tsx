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

type AvailableEvent = {
  eventCode: string
  title: string
  startsAt?: string
  backupCode?: string
}

export function AttendanceReports({ branchCode }: { branchCode: string }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedEventCode, setSelectedEventCode] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)
  const [message, setMessage] = useState("Loading...")

  const loadAvailableEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/events?branchCode=${encodeURIComponent(branchCode)}&limit=50`)
      const payload = (await res.json().catch(() => ({}))) as { events?: AvailableEvent[] }
      setAvailableEvents(payload.events ?? [])
    } catch (err) {
      console.error("Failed to load available events:", err)
    }
  }, [branchCode])

  const loadRecords = useCallback(async () => {
    if (!selectedEventCode) {
      setRecords([])
      setMessage("✓ Select an event to view attendance records.")
      return
    }

    setIsLoading(true)
    setMessage("Loading attendance logs...")
    const params = new URLSearchParams({
      branchCode,
      event: selectedEventCode,
      limit: "200",
    })

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
    }

    setIsLoading(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Failed to load attendance logs.")
      setRecords([])
      return
    }

    const recordCount = (payload.records ?? []).length
    setRecords(payload.records ?? [])

    if (recordCount === 0) {
      setMessage(`✓ No attendance records for ${selectedEventCode}.`)
    } else {
      setMessage(`✓ ${recordCount} attendance record${recordCount === 1 ? "" : "s"} for ${selectedEventCode}.`)
    }
  }, [branchCode, selectedEventCode, startDate, endDate, startTime, endTime])

  // Load initial data on mount
  useEffect(() => {
    loadAvailableEvents()
  }, [branchCode, loadAvailableEvents])

  const downloadReport = useCallback(
    async (format: "csv" | "excel" | "pdf") => {
      if (!selectedEventCode) {
        setMessage("Please select an event first.")
        return
      }

      setIsLoading(true)
      try {
        const params = new URLSearchParams({ branchCode, limit: "10000", event: selectedEventCode })
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
        a.download = `attendance-${selectedEventCode}.${fileExtensions[format]}`

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
    [branchCode, selectedEventCode, startDate, endDate, startTime, endTime]
  )

  const filtered = records

  return (
    <div id="attendance-view" className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <h3 className="text-lg font-semibold">Attendance Reports</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an event to view attendance records.
          </p>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            if (selectedEventCode) loadRecords()
            loadAvailableEvents()
          }} 
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <div className="mt-4">
        <p className="mb-3 text-sm font-medium">Branch Code: <span className="font-semibold">{branchCode}</span></p>

        {/* Events Table */}
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-3">Event Code</th>
                <th className="px-4 py-3">Event Name</th>
                <th className="px-4 py-3">Date/Time</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {availableEvents.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-muted-foreground text-center" colSpan={4}>
                    No events found. Create an event to get started.
                  </td>
                </tr>
              ) : (
                availableEvents.map((event) => (
                  <tr 
                    key={event.eventCode} 
                    className={`border-t transition ${selectedEventCode === event.eventCode ? "bg-primary/5" : "hover:bg-muted/30"}`}
                  >
                    <td className="px-4 py-3 font-medium">{event.eventCode}</td>
                    <td className="px-4 py-3">{event.title}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {event.startsAt ? new Date(event.startsAt).toLocaleString() : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedEventCode === event.eventCode ? "default" : "outline"}
                        disabled={isLoading}
                        onClick={() => {
                          setSelectedEventCode(event.eventCode)
                          // Trigger loadRecords after state update
                          setTimeout(() => {
                            setSelectedEventCode((prev) => {
                              if (prev === event.eventCode) {
                                fetch(`/api/attendance/log?branchCode=${encodeURIComponent(branchCode)}&event=${encodeURIComponent(event.eventCode)}&limit=200`)
                                  .then((res) => res.json())
                                  .then((payload) => {
                                    const recordCount = (payload.records ?? []).length
                                    setRecords(payload.records ?? [])
                                    if (recordCount === 0) {
                                      setMessage(`✓ No attendance records for ${event.eventCode}.`)
                                    } else {
                                      setMessage(`✓ ${recordCount} attendance record${recordCount === 1 ? "" : "s"} for ${event.eventCode}.`)
                                    }
                                    setIsLoading(false)
                                  })
                                  .catch(() => setMessage("Failed to load records."))
                              }
                              return prev
                            })
                          }, 0)
                          setIsLoading(true)
                        }}
                      >
                        View Attendance
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date/Time Filters for Selected Event */}
      {selectedEventCode && (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-medium">Start Date (optional)</p>
            <Input 
              type="date" 
              value={startDate ?? ""} 
              onChange={(e) => {
                setStartDate(e.target.value || null)
              }} 
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">End Date (optional)</p>
            <Input 
              type="date" 
              value={endDate ?? ""} 
              onChange={(e) => {
                setEndDate(e.target.value || null)
              }} 
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Start Time (optional)</p>
            <Input 
              type="time" 
              value={startTime ?? ""} 
              onChange={(e) => {
                setStartTime(e.target.value || null)
              }} 
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">End Time (optional)</p>
            <Input 
              type="time" 
              value={endTime ?? ""} 
              onChange={(e) => {
                setEndTime(e.target.value || null)
              }} 
            />
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-muted-foreground">{message}</p>

      {/* Attendance Records Table */}
      {selectedEventCode && filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => loadRecords()} 
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Refresh Event Logs"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" disabled={isLoading || records.length === 0}>
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
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2">Member ID</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Logged At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={3}>
                  {selectedEventCode ? "No attendance records for this event." : "Select an event to view records."}
                </td>
              </tr>
            ) : (
              filtered.map((record, index) => (
                <tr key={`${record.memberId}-${record.loggedAt}-${index}`} className="border-t">
                  <td className="px-3 py-2">{record.memberId}</td>
                  <td className="px-3 py-2 uppercase text-xs font-medium">
                    <span className={record.method === "qr" ? "text-green-600" : "text-blue-600"}>
                      {record.method}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
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
