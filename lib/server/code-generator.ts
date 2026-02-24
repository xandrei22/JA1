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
