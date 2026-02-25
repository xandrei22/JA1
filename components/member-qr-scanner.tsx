"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCallback, useEffect, useRef, useState } from "react"

type MemberQrScannerProps = {
  branchCode: string
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

export function MemberQrScanner({ branchCode }: MemberQrScannerProps) {
  const scannerRef = useRef<{
    stop: () => Promise<void>
    clear: () => Promise<void> | void
  } | null>(null)
  const processingRef = useRef(false)

  const [eventCode, setEventCode] = useState("SUNDAY-SERVICE")
  const [isScanning, setIsScanning] = useState(false)
  const [lastValue, setLastValue] = useState("")
  const [status, setStatus] = useState<ScanStatus>({
    tone: "idle",
    message: "Ready to scan member QR code.",
  })

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

  const submitAttendance = useCallback(
    async (decodedText: string) => {
      let memberId = ""

      try {
        const parsed = JSON.parse(decodedText) as QrPayload
        if (typeof parsed.memberId === "string") {
          memberId = parsed.memberId
        }
      } catch {
        // Non-JSON payload stays invalid for QR member check.
      }

      if (!memberId) {
        setStatus({
          tone: "error",
          message: "Invalid member QR payload. Expected memberId.",
        })
        return
      }

      if (!eventCode.trim()) {
        setStatus({
          tone: "error",
          message: "Event code is required before scanning.",
        })
        return
      }

      setStatus({ tone: "loading", message: "Logging attendance..." })

      const response = await fetch("/api/attendance/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId,
          eventCode: eventCode.trim(),
          branchCode,
          method: "qr",
          sourceCode: decodedText,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        loggedAt?: string
      }

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
        message: `Attendance logged for ${memberId} at ${timeLabel}.`,
      })
      await stopScanner()
    },
    [branchCode, eventCode, stopScanner]
  )

  const startScanner = useCallback(async () => {
    if (isScanning) return

    if (!eventCode.trim()) {
      setStatus({
        tone: "error",
        message: "Set an event code before starting scanner.",
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
            await submitAttendance(decodedText)
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
  }, [eventCode, isScanning, submitAttendance])

  useEffect(() => {
    return () => {
      void stopScanner()
    }
  }, [stopScanner])

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">Member QR Scanner</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan a member QR code to log attendance for this branch.
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
              onChange={(event) => setEventCode(event.target.value)}
              placeholder="e.g. SUNDAY-SERVICE"
            />
          </div>
        </div>

        <div
          id="member-qr-reader"
          className="min-h-[280px] overflow-hidden rounded-lg border bg-background"
        />

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
