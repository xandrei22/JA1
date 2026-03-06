"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQRCode } from "next-qrcode"
import { useCallback, useEffect, useRef, useState } from "react"

type MemberQrScannerProps = {
  branchCode: string
  defaultMemberName?: string
  initialEntryOption?: "scan" | "manual" | null
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
  method: "qr" | "manual"
  loggedAt?: string
}

export function MemberQrScanner({
  branchCode,
  defaultMemberName,
  initialEntryOption = null,
}: MemberQrScannerProps) {
  const { Canvas } = useQRCode()
  const qrCanvasContainerRef = useRef<HTMLDivElement | null>(null)
  const scannerRef = useRef<{
    stop: () => Promise<void>
    clear: () => Promise<void> | void
  } | null>(null)
  const manualCodeInputRef = useRef<HTMLInputElement | null>(null)
  const processingRef = useRef(false)

  const [eventName, setEventName] = useState("Sunday Service")
  const [eventPlace, setEventPlace] = useState(branchCode)
  const [selectedBranch, setSelectedBranch] = useState(branchCode)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userBranch, setUserBranch] = useState<string | null>(null)
  const [availableBranches, setAvailableBranches] = useState<{ branchCode: string; name: string }[]>([])
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [eventTime, setEventTime] = useState("09:00")
  const [eventCode, setEventCode] = useState("")
  const [sessionPayload, setSessionPayload] = useState<AttendanceSessionPayload | null>(null)
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null)
  const [isGeneratingSession, setIsGeneratingSession] = useState(false)
  const [isConfirmingName, setIsConfirmingName] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [entryOption] = useState<"scan" | "manual" | null>(initialEntryOption)
  const [typedMemberCode, setTypedMemberCode] = useState("")
  const [lastValue, setLastValue] = useState("")
  const [status, setStatus] = useState<ScanStatus>({
    tone: "idle",
    message: "",
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
        branchCode: selectedBranch || branchCode,
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

  // load current user role and branch; if super admin, load branches for selection
  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch("/api/me")
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        const user = json?.user
        setUserRole(user?.role ?? null)
        setUserBranch(user?.branchCode ?? null)
        if (user?.role === "vip_chairman") {
          try {
            const bres = await fetch("/api/branch")
            const bjson = await bres.json()
            setAvailableBranches((bjson.records ?? []).map((r: any) => ({ branchCode: r.branchCode, name: r.name })))
          } catch {
            setAvailableBranches([])
          }
        }
      } catch {
        // noop
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    // keep selectedBranch in sync with incoming prop or user branch
    if (userRole === "vip_chairman") {
      // super admin may choose; keep prop as fallback
      setSelectedBranch((prev) => prev || branchCode)
    } else {
      setSelectedBranch(userBranch ?? branchCode)
    }
  }, [userRole, userBranch, branchCode])

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

      let issuedAt: string | undefined = undefined
      try {
        const parsed = JSON.parse(decodedText) as QrPayload
        if (typeof parsed.memberId === "string") {
          memberId = parsed.memberId
        }
        if (typeof parsed.issuedAt === "string") {
          issuedAt = parsed.issuedAt
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
        loggedAt: issuedAt,
        method: "qr",
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
        method: pendingScan.method,
        sourceCode: pendingScan.sourceCode,
        loggedAt: pendingScan.loggedAt ?? new Date().toISOString(),
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

  const resolveTypedMemberCode = useCallback(async () => {
    const normalizedCode = typedMemberCode.trim()

    if (!normalizedCode) {
      setStatus({
        tone: "error",
        message: "Type a member equivalent code first.",
      })
      return
    }

    setStatus({ tone: "loading", message: "Resolving typed member code..." })

    const response = await fetch(
      `/api/attendance/member-info?memberCode=${encodeURIComponent(normalizedCode)}`
    )

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      memberId?: string
      memberName?: string
    }

    if (!response.ok || !payload.memberId) {
      setStatus({
        tone: "error",
        message: payload.error ?? "Unable to resolve member from typed code.",
      })
      return
    }

    setPendingScan({
      memberId: payload.memberId,
      sourceCode: normalizedCode,
      memberName: payload.memberName?.trim() || defaultMemberName || payload.memberId,
      loggedAt: new Date().toISOString(),
      method: "manual",
    })

    setStatus({
      tone: "idle",
      message: "Member code resolved. Confirm the name before submitting attendance.",
    })
  }, [defaultMemberName, typedMemberCode])

  const getSessionQrCanvas = useCallback(() => {
    return qrCanvasContainerRef.current?.querySelector("canvas") ?? null
  }, [])

  const downloadSessionQrAsImage = useCallback(() => {
    if (!sessionPayload) {
      setStatus({ tone: "error", message: "Generate attendance QR first." })
      return
    }

    const canvas = getSessionQrCanvas()

    if (!canvas) {
      setStatus({ tone: "error", message: "QR image is not ready yet. Try again." })
      return
    }

    const exportCanvas = document.createElement("canvas")
    const exportWidth = 420
    const exportHeight = 560
    exportCanvas.width = exportWidth
    exportCanvas.height = exportHeight

    const context = exportCanvas.getContext("2d")

    if (!context) {
      setStatus({ tone: "error", message: "Unable to prepare image download." })
      return
    }

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, exportWidth, exportHeight)

    const qrSize = 300
    const qrX = (exportWidth - qrSize) / 2
    const qrY = 80
    context.drawImage(canvas, qrX, qrY, qrSize, qrSize)

    context.fillStyle = "#111827"
    context.textAlign = "center"
    context.font = "bold 20px sans-serif"
    context.fillText("JA1 Attendance QR", exportWidth / 2, 36)

    context.font = "16px sans-serif"
    context.fillText(`Event Code: ${sessionPayload.eventCode}`, exportWidth / 2, 420)
    context.fillText(`Equivalent Code: ${sessionPayload.backupCode}`, exportWidth / 2, 452)
    context.fillText(`${sessionPayload.eventDate} ${sessionPayload.eventTime}`, exportWidth / 2, 484)

    const imageUrl = exportCanvas.toDataURL("image/png")
    const link = document.createElement("a")
    const safeEventCode = sessionPayload.eventCode.replace(/[^a-z0-9_-]/gi, "-")
    link.href = imageUrl
    link.download = `${safeEventCode}-attendance-qr.png`
    link.click()

    setStatus({
      tone: "success",
      message: `QR image downloaded. Equivalent code: ${sessionPayload.backupCode}`,
    })
  }, [getSessionQrCanvas, sessionPayload])

  const downloadSessionQrAsPdf = useCallback(async () => {
    if (!sessionPayload) {
      setStatus({ tone: "error", message: "Generate attendance QR first." })
      return
    }

    const canvas = getSessionQrCanvas()

    if (!canvas) {
      setStatus({ tone: "error", message: "QR image is not ready yet. Try again." })
      return
    }

    const imageUrl = canvas.toDataURL("image/png")

    try {
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const safeEventCode = sessionPayload.eventCode.replace(/[^a-z0-9_-]/gi, "-")

      pdf.setFontSize(14)
      pdf.text("JA1 Attendance QR", 15, 18)
      pdf.setFontSize(11)
      pdf.text(`Event Code: ${sessionPayload.eventCode}`, 15, 28)
      pdf.text(`Equivalent Code: ${sessionPayload.backupCode}`, 15, 35)
      pdf.text(`Event: ${sessionPayload.eventName}`, 15, 42)
      pdf.text(`Place: ${sessionPayload.eventPlace}`, 15, 49)
      pdf.text(`Date/Time: ${sessionPayload.eventDate} ${sessionPayload.eventTime}`, 15, 56)

      pdf.addImage(imageUrl, "PNG", 15, 66, 70, 70)
      pdf.save(`${safeEventCode}-attendance-qr.pdf`)

      setStatus({
        tone: "success",
        message: `QR PDF downloaded. Equivalent code: ${sessionPayload.backupCode}`,
      })
    } catch {
      setStatus({
        tone: "error",
        message: "Failed to generate PDF download.",
      })
    }
  }, [getSessionQrCanvas, sessionPayload])

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

  useEffect(() => {
    if (entryOption === "manual") {
      manualCodeInputRef.current?.focus()
    }
  }, [entryOption])

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
              {userRole === "vip_chairman" ? (
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value)
                    setEventPlace(e.target.value)
                  }}
                  className="w-full rounded-md border px-2 py-2"
                >
                  <option value="">Select branch</option>
                  {availableBranches.map((b) => (
                    <option key={b.branchCode} value={b.branchCode}>
                      {b.name} ({b.branchCode})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={eventPlace}
                  onChange={(event) => setEventPlace(event.target.value)}
                  placeholder="e.g. JA1 Main Hall"
                />
              )}
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
                <div ref={qrCanvasContainerRef}>
                  <Canvas
                    text={sessionPayload.qrPayload}
                    options={{
                      width: 150,
                      margin: 2,
                    }}
                  />
                </div>
                <div className="mt-3 grid gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={downloadSessionQrAsImage}>
                    Download Image
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void downloadSessionQrAsPdf()}>
                    Download PDF
                  </Button>
                </div>
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

        {entryOption === "manual" ? (
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">Type Member Equivalent Code</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Type the member code manually (QR token or backup code), then confirm name before submit.
            </p>
            <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="mb-1 text-sm font-medium">Member Code</p>
                <Input
                  ref={manualCodeInputRef}
                  value={typedMemberCode}
                  onChange={(event) => setTypedMemberCode(event.target.value)}
                  placeholder="e.g. DUM-AB12CD"
                />
              </div>
              <Button type="button" variant="outline" onClick={resolveTypedMemberCode}>
                Use Typed Code
              </Button>
            </div>
          </div>
        ) : null}

        {entryOption === "scan" ? (
          <>
            <p className="text-xs text-muted-foreground">
              Scanner uses active event code: {eventCode || "Generate attendance QR first"}
            </p>

            <div
              id="member-qr-reader"
              className="min-h-[280px] overflow-hidden rounded-lg border bg-background"
            />

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={isScanning ? "outline" : "default"}
                onClick={() => void (isScanning ? stopScanner() : startScanner())}
              >
                {isScanning ? "Stop Scanner" : "Start Scanner"}
              </Button>
            </div>
          </>
        ) : null}

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

        {status.message ? (
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
        ) : null}

        {lastValue ? (
          <p className="break-all text-xs text-muted-foreground">
            Last scanned value: {lastValue}
          </p>
        ) : null}
      </div>
    </div>
  )
}
