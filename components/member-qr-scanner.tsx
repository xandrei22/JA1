"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQRCode } from "next-qrcode"
import { useCallback, useEffect, useRef, useState } from "react"

type MemberQrScannerProps = {
  branchCode: string
  defaultMemberName?: string
}

type ScanStatus = {
  tone: "idle" | "success" | "error" | "loading"
  message: string
}

type QrPayload = {
  memberId?: string
  token?: string
  issuedAt?: string
}

type AttendanceSessionPayload = {
  branchCode: string
  eventCode: string
  eventName: string
  eventPlace: string
  eventDate: string
  eventTime: string
  backupCode: string
  qrPayload: string
  generatedAt: string
}

type PendingScan = {
  memberId: string
  sourceCode: string
  memberName: string
}

export function MemberQrScanner({ branchCode, defaultMemberName }: MemberQrScannerProps) {
  const { Canvas } = useQRCode()
  const scannerRef = useRef<{
    stop: () => Promise<void>
    clear: () => Promise<void> | void
  } | null>(null)
  const processingRef = useRef(false)

  const [eventName, setEventName] = useState("Sunday Service")
  const [eventPlace, setEventPlace] = useState(branchCode)
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [eventTime, setEventTime] = useState("09:00")
  const [eventCode, setEventCode] = useState("")
  const [sessionPayload, setSessionPayload] = useState<AttendanceSessionPayload | null>(null)
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null)
  const [isGeneratingSession, setIsGeneratingSession] = useState(false)
  const [isConfirmingName, setIsConfirmingName] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [lastValue, setLastValue] = useState("")
  const [status, setStatus] = useState<ScanStatus>({
    tone: "idle",
    message: "Generate attendance session QR then scan member QR code.",
  })

  const generateSessionCode = useCallback(async () => {
    if (!eventName.trim() || !eventPlace.trim() || !eventDate.trim() || !eventTime.trim()) {
      setStatus({
        tone: "error",
        message: "Event name, place, date, and time are required.",
      })
      return
    }

    setIsGeneratingSession(true)
    setStatus({ tone: "loading", message: "Generating attendance session QR..." })

    const response = await fetch("/api/attendance/session-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        branchCode,
        eventName: eventName.trim(),
        eventPlace: eventPlace.trim(),
        eventDate: eventDate.trim(),
        eventTime: eventTime.trim(),
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
    } & Partial<AttendanceSessionPayload>

    setIsGeneratingSession(false)

    if (!response.ok || !payload.eventCode || !payload.qrPayload || !payload.backupCode) {
      setStatus({
        tone: "error",
        message: payload.error ?? "Failed to generate attendance session code.",
      })
      return
    }

    const generated = payload as AttendanceSessionPayload
    setSessionPayload(generated)
    setEventCode(generated.eventCode)
    setStatus({
      tone: "success",
      message: `Attendance session ready: ${generated.eventCode}`,
    })
  }, [branchCode, eventDate, eventName, eventPlace, eventTime])

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return

    try {
      await scannerRef.current.stop()
    } catch {
      // noop
    }

    try {
      await Promise.resolve(scannerRef.current.clear())
    } catch {
      // noop
    }

    scannerRef.current = null
    setIsScanning(false)
  }, [])

  const handleDecodedScan = useCallback(
    async (decodedText: string) => {
      let memberId = ""

      try {
        const parsed = JSON.parse(decodedText) as QrPayload
        if (typeof parsed.memberId === "string") {
          memberId = parsed.memberId
        }
      } catch {
        // noop
      }

      if (!memberId) {
        setStatus({
          tone: "error",
          message: "Invalid member QR payload. Expected memberId.",
        })
        return
      }

      setStatus({ tone: "loading", message: "Loading member name..." })

      const response = await fetch(
        `/api/attendance/member-info?memberId=${encodeURIComponent(memberId)}`
      )

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        memberName?: string
      }

      if (!response.ok) {
        setStatus({
          tone: "error",
          message: payload.error ?? "Failed to resolve member name.",
        })
        return
      }

      setPendingScan({
        memberId,
        sourceCode: decodedText,
        memberName: payload.memberName?.trim() || defaultMemberName || memberId,
      })

      setStatus({
        tone: "idle",
        message: "Confirm the auto-filled name before submitting attendance.",
      })

      await stopScanner()
    },
    [defaultMemberName, stopScanner]
  )

  const submitConfirmedAttendance = useCallback(async () => {
    if (!pendingScan) {
      setStatus({
        tone: "error",
        message: "Scan a member QR first.",
      })
      return
    }

    const checkedName = pendingScan.memberName.trim()

    if (!checkedName) {
      setStatus({
        tone: "error",
        message: "Name is required before confirming attendance.",
      })
      return
    }

    if (!eventCode.trim()) {
      setStatus({
        tone: "error",
        message: "Event code is required before confirming attendance.",
      })
      return
    }

    setIsConfirmingName(true)
    setStatus({ tone: "loading", message: "Logging attendance..." })

    const response = await fetch("/api/attendance/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        memberId: pendingScan.memberId,
        memberName: checkedName,
        eventCode: eventCode.trim(),
        branchCode,
        method: "qr",
        sourceCode: pendingScan.sourceCode,
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      loggedAt?: string
      memberName?: string
    }

    setIsConfirmingName(false)

    if (!response.ok) {
      setStatus({
        tone: "error",
        message: payload.error ?? "Failed to log attendance.",
      })
      return
    }

    const timeLabel = payload.loggedAt
      ? new Date(payload.loggedAt).toLocaleTimeString()
      : "now"

    setStatus({
      tone: "success",
      message: `Attendance logged for ${payload.memberName ?? checkedName} at ${timeLabel}.`,
    })
    setPendingScan(null)
  }, [branchCode, eventCode, pendingScan])

  const startScanner = useCallback(async () => {
    if (isScanning) return

    if (!sessionPayload || !eventCode.trim()) {
      setStatus({
        tone: "error",
        message: "Generate attendance QR first. Event code is created together with QR.",
      })
      return
    }

    setStatus({ tone: "loading", message: "Starting camera..." })

    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const scanner = new Html5Qrcode("member-qr-reader")

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
        },
        async (decodedText: string) => {
          if (processingRef.current) return
          processingRef.current = true
          setLastValue(decodedText)

          try {
            await handleDecodedScan(decodedText)
          } finally {
            window.setTimeout(() => {
              processingRef.current = false
            }, 1200)
          }
        },
        () => {
          // ignore frequent decode errors
        }
      )

      scannerRef.current = scanner
      setIsScanning(true)
      setStatus({ tone: "idle", message: "Scanner is active. Point camera at member QR." })
    } catch {
      setStatus({
        tone: "error",
        message: "Unable to access camera. Allow camera permission and try again.",
      })
    }
  }, [eventCode, handleDecodedScan, isScanning, sessionPayload])

  useEffect(() => {
    return () => {
      void stopScanner()
    }
  }, [stopScanner])

  return (
    <div id="attendance-logging" className="rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border bg-muted/20 p-4">
          <h4 className="text-base font-semibold">Attendance Session Generator</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            VIP/Admin can set place, event, date, and time to generate a random attendance QR with equivalent backup code.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium">Event Name</p>
              <Input
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
                placeholder="e.g. Sunday Service"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Place</p>
              <Input
                value={eventPlace}
                onChange={(event) => setEventPlace(event.target.value)}
                placeholder="e.g. JA1 Main Hall"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Date</p>
              <Input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Time</p>
              <Input
                type="time"
                value={eventTime}
                onChange={(event) => setEventTime(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <Button type="button" onClick={generateSessionCode} disabled={isGeneratingSession}>
              {isGeneratingSession ? "Generating..." : "Generate Attendance QR"}
            </Button>
          </div>

          {sessionPayload ? (
            <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="rounded-md border bg-background p-3">
                <Canvas
                  text={sessionPayload.qrPayload}
                  options={{
                    width: 150,
                    margin: 2,
                  }}
                />
              </div>
              <div className="space-y-1 rounded-md border bg-background p-3 text-sm">
                <p><span className="font-medium">Event Code:</span> {sessionPayload.eventCode}</p>
                <p><span className="font-medium">Equivalent Backup Code:</span> {sessionPayload.backupCode}</p>
                <p><span className="font-medium">Event:</span> {sessionPayload.eventName}</p>
                <p><span className="font-medium">Place:</span> {sessionPayload.eventPlace}</p>
                <p><span className="font-medium">Date/Time:</span> {sessionPayload.eventDate} {sessionPayload.eventTime}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="text-lg font-semibold">Member QR Scanner</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan member QR, then confirm auto-filled name to complete attendance.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium">Branch Code</p>
            <Input value={branchCode} readOnly />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Event Code</p>
            <Input
              value={eventCode}
              readOnly
              placeholder="Auto-generated with attendance QR"
            />
          </div>
        </div>

        <div
          id="member-qr-reader"
          className="min-h-[280px] overflow-hidden rounded-lg border bg-background"
        />

        {pendingScan ? (
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">Confirm Member Name</p>
            <p className="mt-1 text-xs text-muted-foreground">Member ID: {pendingScan.memberId}</p>
            <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <div>
                <p className="mb-1 text-sm font-medium">Name</p>
                <Input
                  value={pendingScan.memberName}
                  onChange={(event) =>
                    setPendingScan((current) =>
                      current
                        ? {
                            ...current,
                            memberName: event.target.value,
                          }
                        : current
                    )
                  }
                />
              </div>
              <Button type="button" onClick={submitConfirmedAttendance} disabled={isConfirmingName}>
                {isConfirmingName ? "Submitting..." : "Confirm Attendance"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingScan(null)}
                disabled={isConfirmingName}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={startScanner} disabled={isScanning}>
            Start Scanner
          </Button>
          <Button type="button" variant="outline" onClick={() => void stopScanner()} disabled={!isScanning}>
            Stop Scanner
          </Button>
        </div>

        <p
          className={[
            "text-sm",
            status.tone === "error" ? "text-destructive" : "",
            status.tone === "success" ? "text-emerald-600" : "",
            status.tone === "loading" ? "text-primary" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {status.message}
        </p>

        {lastValue ? (
          <p className="break-all text-xs text-muted-foreground">
            Last scanned value: {lastValue}
          </p>
        ) : null}
      </div>
    </div>
  )
}
