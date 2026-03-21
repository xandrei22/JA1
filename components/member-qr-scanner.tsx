"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MemberAttendanceHistory } from "@/components/member-attendance-history"
import { useQRCode } from "next-qrcode"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

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
  eventStartTime: string
  eventEndTime: string
  backupCode: string
  qrPayload: string
  generatedAt: string
}

type SessionListResponse = {
  records?: AttendanceSessionPayload[]
  error?: string
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

  const [eventName, setEventName] = useState("")
  const [eventPlace, setEventPlace] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userBranch, setUserBranch] = useState<string | null>(null)
  const [availableBranches, setAvailableBranches] = useState<{ branchCode: string; name: string }[]>([])
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [eventStartTime, setEventStartTime] = useState("09:00")
  const [eventEndTime, setEventEndTime] = useState("10:00")
  const [eventCode, setEventCode] = useState("")
  const [sessionPayload, setSessionPayload] = useState<AttendanceSessionPayload | null>(null)
  const [sessionActivities, setSessionActivities] = useState<AttendanceSessionPayload[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null)
  const [isGeneratingSession, setIsGeneratingSession] = useState(false)
  const [isConfirmingName, setIsConfirmingName] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [manualOpen, setManualOpen] = useState<boolean>(initialEntryOption === "manual")
  const [typedMemberCode, setTypedMemberCode] = useState("")
  const [lastValue, setLastValue] = useState("")
  const [status, setStatus] = useState<ScanStatus>({
    tone: "idle",
    message: "",
  })

  const [scannerOpen, setScannerOpen] = useState<boolean>(initialEntryOption === "scan")

  // respond to server-provided initial entry option updates (e.g. ?entry=manual)
  useEffect(() => {
    if (initialEntryOption === "manual") {
      setManualOpen(true)
    } else if (initialEntryOption === "scan") {
      setScannerOpen(true)
    }
  }, [initialEntryOption])

  const canGenerateSession = userRole === "vip_chairman" || userRole === "supervising_pastor"

  const getBranchScope = useCallback(() => {
    return (selectedBranch || userBranch || branchCode || "").trim()
  }, [selectedBranch, userBranch, branchCode])

  useEffect(() => {
    function onOpenScanner() {
      setScannerOpen(true)
    }

    function onOpenManual() {
      setManualOpen(true)
      // focus input when opened via event
      setTimeout(() => manualCodeInputRef.current?.focus(), 50)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("ja1:open-scanner", onOpenScanner as EventListener)
      window.addEventListener("ja1:open-manual", onOpenManual as EventListener)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("ja1:open-scanner", onOpenScanner as EventListener)
        window.removeEventListener("ja1:open-manual", onOpenManual as EventListener)
      }
    }
  }, [])

  useEffect(() => {
    if (scannerOpen) {
      setStatus({ tone: "idle", message: "Scanner ready. Start camera to scan." })
    }
  }, [scannerOpen])

  const loadSessionActivities = useCallback(async () => {
    const activeBranch = getBranchScope()
    if (!activeBranch) {
      setSessionActivities([])
      return
    }

    setIsLoadingActivities(true)
    try {
      const res = await fetch(
        `/api/attendance/session-code?branchCode=${encodeURIComponent(activeBranch)}&limit=100`
      )
      const payload = (await res.json().catch(() => ({}))) as SessionListResponse
      if (!res.ok) {
        setStatus({ tone: "error", message: payload.error ?? "Failed to load attendance activities." })
        setSessionActivities([])
        return
      }
      setSessionActivities(payload.records ?? [])
    } catch {
      setStatus({ tone: "error", message: "Failed to load attendance activities." })
      setSessionActivities([])
    } finally {
      setIsLoadingActivities(false)
    }
  }, [getBranchScope])

  const generateSessionCode = useCallback(async () => {
    if (!eventName.trim() || !eventPlace.trim() || !eventDate.trim() || !eventStartTime.trim() || !eventEndTime.trim()) {
      setStatus({
        tone: "error",
        message: "Event name, place, date, start time, and end time are required.",
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
        branchCode: getBranchScope(),
        eventName: eventName.trim(),
        eventPlace: eventPlace.trim(),
        eventDate: eventDate.trim(),
        eventStartTime: eventStartTime.trim(),
        eventEndTime: eventEndTime.trim(),
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
    void loadSessionActivities()
    setStatus({
      tone: "success",
      message: `Attendance session ready: ${generated.eventCode}`,
    })
  }, [eventDate, eventEndTime, eventName, eventPlace, eventStartTime, getBranchScope, loadSessionActivities])

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

  // attempt to load any active attendance session for this branch so non-generator
  // roles can scan or use manual codes against an existing session.
  useEffect(() => {
    let mounted = true

    async function loadCurrent() {
      try {
        const res = await fetch(`/api/attendance/current-session?branchCode=${encodeURIComponent(selectedBranch || branchCode)}`)
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        if (json?.found && json?.session) {
          setSessionPayload(json.session)
          setEventCode(json.session.eventCode)
        }
      } catch {
        // noop
      }
    }

    void loadCurrent()

    return () => {
      mounted = false
    }
  }, [selectedBranch, branchCode])

  useEffect(() => {
    if (!canGenerateSession) return
    void loadSessionActivities()
  }, [canGenerateSession, loadSessionActivities])

  // NOTE: polling removed — the component attempts one immediate fetch
  // for a current session on mount. Users without generator rights should
  // ask VIP/Admin to create a session; attempting to start the scanner
  // without an active session will show a validation message.

  useEffect(() => {
    // keep selectedBranch in sync with incoming prop or user branch
    if (userRole === "vip_chairman") {
      // super admin may choose freely; don't force a default
      // keep selectedBranch as is
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
      // Attempt to parse payload. There are two QR types:
      // - member credential: { memberId, token, issuedAt }
      // - attendance session: { type: 'attendance_session', eventCode, branchCode, ... }
      let parsed: any = null
      try {
        parsed = JSON.parse(decodedText)
      } catch {
        parsed = null
      }

      if (parsed && parsed.type === "attendance_session" && parsed.eventCode) {
        // validate that this session was created/persisted by an admin
        setStatus({ tone: "loading", message: "Validating session QR..." })
        try {
          const res = await fetch(
            `/api/attendance/validate-session?eventCode=${encodeURIComponent(parsed.eventCode)}&branchCode=${encodeURIComponent(parsed.branchCode ?? selectedBranch ?? branchCode)}`
          )
          const v = await res.json().catch(() => ({}))
          if (!res.ok || !v?.valid) {
            setStatus({ tone: "error", message: "Unrecognized session QR. Only admin-generated QRs are accepted." })
            return
          }

          // accepted session — set as active session
          setSessionPayload({
            branchCode: parsed.branchCode ?? selectedBranch ?? branchCode,
            eventCode: parsed.eventCode,
            eventName: parsed.eventName ?? "",
            eventPlace: parsed.eventPlace ?? "",
            eventDate: parsed.eventDate ?? "",
            eventStartTime: parsed.eventStartTime ?? parsed.eventTime ?? "",
            eventEndTime: parsed.eventEndTime ?? "",
            backupCode: parsed.equivalentCode ?? "",
            qrPayload: decodedText,
            generatedAt: parsed.issuedAt ?? new Date().toISOString(),
          })
          setEventCode(parsed.eventCode)
          setStatus({ tone: "success", message: `Loaded attendance session: ${parsed.eventCode}` })
        } catch {
          setStatus({ tone: "error", message: "Failed to validate session QR." })
        }

        return
      }

      // member credential flow (token or backup code or JSON memberId)
      let memberId = ""
      let issuedAt: string | undefined = undefined
      if (parsed && typeof parsed.memberId === "string") {
        memberId = parsed.memberId
        if (typeof parsed.issuedAt === "string") issuedAt = parsed.issuedAt
      }

      if (!memberId) {
        setStatus({ tone: "error", message: "Invalid member QR payload. Expected memberId." })
        return
      }

      setStatus({ tone: "loading", message: "Resolving member..." })

      const response = await fetch(`/api/attendance/member-info?memberId=${encodeURIComponent(memberId)}`)
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        memberName?: string
      }

      if (!response.ok) {
        setStatus({ tone: "error", message: payload.error ?? "Failed to resolve member name." })
        return
      }

      setPendingScan({
        memberId,
        sourceCode: decodedText,
        memberName: payload.memberName?.trim() || defaultMemberName || memberId,
        loggedAt: issuedAt,
        method: "qr",
      })

      setStatus({ tone: "idle", message: "Confirm the auto-filled name before submitting attendance." })

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

  const drawSessionExportCanvas = useCallback(async (session: AttendanceSessionPayload) => {
    const { toDataURL } = await import("qrcode")
    const qrDataUrl = await toDataURL(session.qrPayload, {
      margin: 1,
      width: 300,
      color: { dark: "#111827", light: "#ffffff" },
    })

    const qrImage = new Image()
    await new Promise<void>((resolve, reject) => {
      qrImage.onload = () => resolve()
      qrImage.onerror = () => reject(new Error("QR image load failed"))
      qrImage.src = qrDataUrl
    })

    const exportCanvas = document.createElement("canvas")
    const exportWidth = 420
    const exportHeight = 560
    exportCanvas.width = exportWidth
    exportCanvas.height = exportHeight

    const context = exportCanvas.getContext("2d")
    if (!context) {
      throw new Error("Unable to prepare image")
    }

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, exportWidth, exportHeight)

    const qrSize = 300
    const qrX = (exportWidth - qrSize) / 2
    const qrY = 80
    context.drawImage(qrImage, qrX, qrY, qrSize, qrSize)

    context.fillStyle = "#111827"
    context.textAlign = "center"
    context.font = "bold 20px sans-serif"
    context.fillText("JA1 Attendance QR", exportWidth / 2, 36)

    context.font = "16px sans-serif"
    context.fillText(`Event Code: ${session.eventCode}`, exportWidth / 2, 420)
    context.fillText(`Equivalent Code: ${session.backupCode}`, exportWidth / 2, 452)
    context.fillText(
      `${session.eventDate} ${session.eventStartTime} - ${session.eventEndTime || "--:--"}`,
      exportWidth / 2,
      484
    )

    return exportCanvas
  }, [])

  const downloadSessionQrAsImage = useCallback(async (targetSession?: AttendanceSessionPayload) => {
    const session = targetSession ?? sessionPayload
    if (!session) {
      setStatus({ tone: "error", message: "Generate attendance QR first." })
      return
    }

    let exportCanvas: HTMLCanvasElement
    try {
      exportCanvas = await drawSessionExportCanvas(session)
    } catch {
      setStatus({ tone: "error", message: "Unable to prepare image download." })
      return
    }

    const imageUrl = exportCanvas.toDataURL("image/png")
    const link = document.createElement("a")
    const safeEventCode = session.eventCode.replace(/[^a-z0-9_-]/gi, "-")
    link.href = imageUrl
    link.download = `${safeEventCode}-attendance-qr.png`
    link.click()

    setStatus({
      tone: "success",
      message: `QR image downloaded. Equivalent code: ${session.backupCode}`,
    })
  }, [drawSessionExportCanvas, sessionPayload])

  const downloadSessionQrAsPdf = useCallback(async (targetSession?: AttendanceSessionPayload) => {
    const session = targetSession ?? sessionPayload
    if (!session) {
      setStatus({ tone: "error", message: "Generate attendance QR first." })
      return
    }

    let exportCanvas: HTMLCanvasElement
    try {
      exportCanvas = await drawSessionExportCanvas(session)
    } catch {
      setStatus({ tone: "error", message: "Unable to prepare PDF download." })
      return
    }

    const imageUrl = exportCanvas.toDataURL("image/png")

    try {
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const safeEventCode = session.eventCode.replace(/[^a-z0-9_-]/gi, "-")

      pdf.setFontSize(14)
      pdf.text("JA1 Attendance QR", 15, 18)
      pdf.setFontSize(11)
      pdf.text(`Event Code: ${session.eventCode}`, 15, 28)
      pdf.text(`Equivalent Code: ${session.backupCode}`, 15, 35)
      pdf.text(`Event: ${session.eventName}`, 15, 42)
      pdf.text(`Place: ${session.eventPlace}`, 15, 49)
      pdf.text(
        `Date/Time: ${session.eventDate} ${session.eventStartTime} - ${session.eventEndTime || "--:--"}`,
        15,
        56
      )

      pdf.addImage(imageUrl, "PNG", 15, 66, 70, 70)
      pdf.save(`${safeEventCode}-attendance-qr.pdf`)

      setStatus({
        tone: "success",
        message: `QR PDF downloaded. Equivalent code: ${session.backupCode}`,
      })
    } catch {
      setStatus({
        tone: "error",
        message: "Failed to generate PDF download.",
      })
    }
  }, [drawSessionExportCanvas, sessionPayload])

  const downloadSessionAttendeesCsv = useCallback(async (targetSession?: AttendanceSessionPayload) => {
    const session = targetSession ?? sessionPayload
    if (!session) {
      setStatus({ tone: "error", message: "Generate attendance QR first." })
      return
    }

    try {
      const params = new URLSearchParams({
        branchCode: session.branchCode,
        event: session.eventCode,
        start: session.eventDate,
        end: session.eventDate,
        export: "csv",
        limit: "10000",
      })

      if (session.eventStartTime) {
        params.set("startTime", session.eventStartTime)
      }
      if (session.eventEndTime) {
        params.set("endTime", session.eventEndTime)
      }

      const response = await fetch(`/api/attendance/log?${params.toString()}`, {
        method: "GET",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        setStatus({ tone: "error", message: payload.error ?? "Failed to download attendee list." })
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const safeEventCode = session.eventCode.replace(/[^a-z0-9_-]/gi, "-")
      link.download = `${safeEventCode}-attendees.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      setStatus({ tone: "success", message: "Attendee list CSV downloaded." })
    } catch {
      setStatus({ tone: "error", message: "Failed to download attendee list." })
    }
  }, [sessionPayload])

  const isSessionActive = useCallback((session: AttendanceSessionPayload) => {
    const timePart = session.eventEndTime?.trim() || session.eventStartTime?.trim() || "23:59"
    const boundary = new Date(`${session.eventDate}T${timePart}:59`)
    if (Number.isNaN(boundary.getTime())) return false
    return Date.now() <= boundary.getTime()
  }, [])

  const startScanner = useCallback(async () => {
    if (isScanning) return

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
    if (manualOpen) {
      manualCodeInputRef.current?.focus()
    }
  }, [manualOpen])

  // auto-start camera when scanner dialog opens
  useEffect(() => {
    if (scannerOpen) {
      void startScanner()
    }
    // when scanner dialog closes ensure camera is stopped
    if (!scannerOpen) {
      void stopScanner()
    }
  }, [scannerOpen, startScanner, stopScanner])

  return (
    <div id="attendance-logging" className="rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-4">
        {canGenerateSession ? (
          <div className="rounded-lg border bg-muted/20 p-4">
            <h4 className="text-base font-semibold">Attendance Session Generator</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              VIP/Admin can set place, event, date, and start/end time to generate a random attendance QR with equivalent backup code.
            </p>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium">Event Name</p>
                <Input
                  value={eventName}
                  onChange={(event) => setEventName(event.target.value)}
                  placeholder="Enter Event Name"
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Place</p>
                <Input
                  value={eventPlace}
                  onChange={(event) => setEventPlace(event.target.value)}
                  placeholder="Enter Name or Address"
                />
              </div>
              {userRole === "vip_chairman" ? (
                <div>
                  <p className="mb-1 text-sm font-medium">Branch</p>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full rounded-md border px-2 py-2"
                  >
                    <option value="">Select branch</option>
                    {availableBranches.map((b) => (
                      <option key={b.branchCode} value={b.branchCode}>
                        {b.name} ({b.branchCode})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <p className="mb-1 text-sm font-medium">Date</p>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Start Time</p>
                <Input
                  type="time"
                  value={eventStartTime}
                  onChange={(event) => setEventStartTime(event.target.value)}
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">End Time</p>
                <Input
                  type="time"
                  value={eventEndTime}
                  onChange={(event) => setEventEndTime(event.target.value)}
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
                    <Button type="button" variant="outline" size="sm" onClick={() => void downloadSessionAttendeesCsv()}>
                      Download Attendees CSV
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 rounded-md border bg-background p-3 text-sm">
                  <p><span className="font-medium">Event Code:</span> {sessionPayload.eventCode}</p>
                  <p><span className="font-medium">Equivalent Backup Code:</span> {sessionPayload.backupCode}</p>
                  <p><span className="font-medium">Event:</span> {sessionPayload.eventName}</p>
                  <p><span className="font-medium">Place:</span> {sessionPayload.eventPlace}</p>
                  <p><span className="font-medium">Date/Time:</span> {sessionPayload.eventDate} {sessionPayload.eventStartTime} - {sessionPayload.eventEndTime || "--:--"}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-md border bg-background p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Attendance Activities</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadSessionActivities()}>
                  Refresh
                </Button>
              </div>

              {isLoadingActivities ? (
                <p className="text-sm text-muted-foreground">Loading activities...</p>
              ) : sessionActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance activities yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-2">Event</th>
                        <th className="px-2 py-2">Place</th>
                        <th className="px-2 py-2">Date</th>
                        <th className="px-2 py-2">Time</th>
                        <th className="px-2 py-2">Event Code</th>
                        <th className="px-2 py-2">Manual Code</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionActivities.map((activity) => {
                        const active = isSessionActive(activity)
                        return (
                          <tr key={`${activity.eventCode}-${activity.generatedAt}`} className="border-b align-top">
                            <td className="px-2 py-2 font-medium">{activity.eventName}</td>
                            <td className="px-2 py-2">{activity.eventPlace}</td>
                            <td className="px-2 py-2">{activity.eventDate}</td>
                            <td className="px-2 py-2">{activity.eventStartTime} - {activity.eventEndTime || "--:--"}</td>
                            <td className="px-2 py-2">{activity.eventCode}</td>
                            <td className="px-2 py-2 font-mono">{activity.backupCode}</td>
                            <td className="px-2 py-2">
                              <span className={active ? "text-emerald-600" : "text-muted-foreground"}>
                                {active ? "Active" : "Expired"}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSessionPayload(activity)
                                    setEventCode(activity.eventCode)
                                    setStatus({ tone: "success", message: `Loaded QR for ${activity.eventCode}.` })
                                  }}
                                >
                                  View QR
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void downloadSessionQrAsImage(activity)}
                                >
                                  Image
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void downloadSessionQrAsPdf(activity)}
                                >
                                  PDF
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void downloadSessionAttendeesCsv(activity)}
                                >
                                  Attendees
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Scanner and manual dialogs are opened via navbar events; no inline buttons here. */}

        {/* Manual code dialog */}
        <Dialog open={manualOpen} onOpenChange={(open) => {
          setManualOpen(open)
          if (open) manualCodeInputRef.current?.focus()
        }}>
          <DialogContent className="max-w-md">
            <DialogTitle>Type Member Equivalent Code</DialogTitle>
            <DialogDescription>
              Type the member code manually (QR token or backup code), then confirm name before submit.
            </DialogDescription>

            <div className="mt-4 grid gap-3">
              <div>
                <p className="mb-1 text-sm font-medium">Member Code</p>
                <Input
                  ref={manualCodeInputRef}
                  value={typedMemberCode}
                  onChange={(event) => setTypedMemberCode(event.target.value)}
                  placeholder="e.g. CODE-AB12CD"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => { void resolveTypedMemberCode(); setManualOpen(false) }}>
                  Use Typed Code
                </Button>
                <Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Scanner dialog */}
        <Dialog open={scannerOpen} onOpenChange={(open) => {
          setScannerOpen(open)
        }}>
          <DialogContent className="max-w-2xl">
            <DialogTitle>Scan Attendance QR</DialogTitle>
            <DialogDescription>
              Open your camera to scan member QR or session QR. Member QR will be validated by the server; session QR must be admin-generated.
            </DialogDescription>

            <div className="mt-4">
              <p className="text-xs text-muted-foreground">{sessionPayload ? `Active event: ${eventCode}` : `No active event loaded`}</p>
              <div id="member-qr-reader" className="min-h-[280px] overflow-hidden rounded-lg border bg-background mt-2" />
              <div className="mt-3 flex gap-3">
                <Button type="button" variant={isScanning ? "outline" : "default"} onClick={() => void (isScanning ? stopScanner() : startScanner())}>
                  {isScanning ? "Stop Scanner" : "Start Camera"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setSessionPayload(null); setEventCode("") }}>
                  Clear Session
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setScannerOpen(false); void stopScanner() }}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* For non-admin users show personal attendance history table instead of inline status messages */}
        {(() => {
          const isAdmin =
            userRole === "vip_chairman" ||
            userRole === "supervising_pastor" ||
            userRole === "age_group_chairman" ||
            userRole === "branch_admin"

          if (!isAdmin) {
            return <MemberAttendanceHistory />
          }

          return status.message ? (
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
          ) : null
        })()}

        {lastValue ? (
          <p className="break-all text-xs text-muted-foreground">
            Last scanned value: {lastValue}
          </p>
        ) : null}
      </div>
    </div>
  )
}
