import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

const KEYLEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, KEYLEN).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":")

  if (!salt || !hash) {
    return false
  }

  const derived = scryptSync(password, salt, KEYLEN)
  const hashBuffer = Buffer.from(hash, "hex")

  if (derived.length !== hashBuffer.length) {
    return false
  }

  return timingSafeEqual(derived, hashBuffer)
}
