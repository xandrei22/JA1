import { randomBytes } from "crypto"

export type AttendanceMethod = "qr" | "manual"

export function generateQrToken(): string {
  return randomBytes(24).toString("hex")
}

export function generateBackupCode(branchCode: string): string {
  const year = new Date().getFullYear()
  const serial = randomBytes(2).toString("hex").toUpperCase()
  const branch = branchCode.trim().toUpperCase()
  return `JA1-${branch}-${year}-${serial}`
}

export function buildQrPayload(memberId: string, token: string): string {
  return JSON.stringify({
    memberId,
    token,
    issuedAt: new Date().toISOString(),
  })
}

export function generateEventCode(eventName: string, eventDate: string): string {
  const cleanEventName = eventName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16)

  const normalizedDate = eventDate.replace(/-/g, "")
  const serial = randomBytes(2).toString("hex").toUpperCase()

  return `${cleanEventName || "EVENT"}-${normalizedDate}-${serial}`
}

export function buildSessionQrPayload(input: {
  branchCode: string
  eventCode: string
  eventName: string
  eventPlace: string
  eventDate: string
  eventStartTime: string
  eventEndTime: string
  equivalentCode: string
}): string {
  return JSON.stringify({
    type: "attendance_session",
    branchCode: input.branchCode,
    eventCode: input.eventCode,
    eventName: input.eventName,
    eventPlace: input.eventPlace,
    eventDate: input.eventDate,
    eventStartTime: input.eventStartTime,
    eventEndTime: input.eventEndTime,
    // Backward compatibility for older clients that still read eventTime.
    eventTime: input.eventStartTime,
    equivalentCode: input.equivalentCode,
    issuedAt: new Date().toISOString(),
  })
}
