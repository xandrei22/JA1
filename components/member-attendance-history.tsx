"use client"

import { useEffect, useRef, useState } from "react"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

type AttendanceRecord = {
  id?: string
  memberId: string
  memberName?: string
  eventCode: string
  branchCode: string
  method: string
  sourceCode: string
  loggedByUserId?: string
  loggedAt: string
}

function mapSupabaseRowToRecord(row: any): AttendanceRecord {
  return {
    id: row.id?.toString?.() ?? undefined,
    memberId: row.member_id ?? row.memberId ?? "",
    memberName: row.member_name ?? row.memberName ?? undefined,
    eventCode: row.event_code ?? row.eventCode ?? "",
    branchCode: row.branch_code ?? row.branchCode ?? "",
    method: row.method ?? "",
    sourceCode: row.source_code ?? row.sourceCode ?? "",
    loggedByUserId: row.logged_by_user_id ?? undefined,
    loggedAt: row.logged_at ?? new Date().toISOString(),
  }
}

export function MemberAttendanceHistory() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [message, setMessage] = useState("")
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const pollRef = useRef<number | null>(null)
  const myMemberIdRef = useRef<string | null>(null)

  async function load() {
    try {
      const res = await fetch(`/api/attendance/my-logs`)
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(payload.error ?? "Failed to load attendance history.")
        return
      }

      const recs = (payload.records ?? []).map(mapSupabaseRowToRecord)
      setRecords(recs)
      setMessage(recs.length ? "" : "No attendance records yet.")
      if (recs.length && !myMemberIdRef.current) {
        myMemberIdRef.current = recs[0].memberId
      }
    } catch (err) {
      setMessage("Failed to load attendance history.")
    }
  }

  useEffect(() => {
    void load()

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // prefer real-time via Supabase if env vars are present
    if (url && key) {
      try {
        const supabase = createClient(url, key)
        supabaseRef.current = supabase

        const channel = supabase
          .channel("realtime-attendance")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "attendance_logs" },
            (payload: any) => {
              const row = payload?.new
              if (!row) return

              // if we know the current member id, filter; otherwise attempt to load
              const memberId = row.member_id ?? row.memberId
              if (myMemberIdRef.current && memberId !== myMemberIdRef.current) return

              const record = mapSupabaseRowToRecord(row)
              setRecords((prev) => [record, ...prev])
              setMessage("")
            }
          )

        void channel.subscribe()

        return () => {
          void channel.unsubscribe()
        }
      } catch {
        // fall back to polling
      }
    }

    // polling fallback: refresh every 5s
    pollRef.current = window.setInterval(() => {
      void load()
    }, 5000)

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
      }
    }
  }, [])

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">My Attendance</h4>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{message}</p>

      {records && records.length ? (
        <div className="mt-3 overflow-auto">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="w-1/6 p-2">When</th>
                <th className="w-1/6 p-2">Event</th>
                <th className="w-1/6 p-2">Branch</th>
                <th className="w-1/6 p-2">Method</th>
                <th className="w-1/3 p-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={r.id ?? `${r.memberId}-${idx}`} className="border-t">
                  <td className="p-2">{new Date(r.loggedAt).toLocaleString()}</td>
                  <td className="p-2">{r.eventCode}</td>
                  <td className="p-2">{r.branchCode}</td>
                  <td className="p-2">{r.method}</td>
                  <td className="p-2 break-all">{r.sourceCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
