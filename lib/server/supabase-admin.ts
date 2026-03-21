const rawSupabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const rawSupabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function normalizeEnvValue(input: string | undefined): string | null {
  if (!input) return null
  const normalized = input.trim().replace(/^"|"$/g, "")
  return normalized || null
}

function normalizeSupabaseUrl(input: string | undefined): string | null {
  const envValue = normalizeEnvValue(input)
  if (!envValue) return null
  const normalized = envValue.replace(/\/+$/, "")
  if (!normalized) return null

  try {
    const parsed = new URL(normalized)
    if (!/^https?:$/i.test(parsed.protocol)) {
      return null
    }
    return parsed.toString().replace(/\/+$/, "")
  } catch {
    return null
  }
}

const SUPABASE_URL = normalizeSupabaseUrl(rawSupabaseUrl)
const SUPABASE_SERVICE_ROLE_KEY = normalizeEnvValue(rawSupabaseServiceRoleKey)

function toNetworkError(action: string, cause: unknown): Error {
  const message = cause instanceof Error ? cause.message : String(cause)
  const nestedCause =
    cause && typeof cause === "object" && "cause" in cause
      ? (cause as { cause?: unknown }).cause
      : undefined
  const nestedMessage = nestedCause instanceof Error ? nestedCause.message : nestedCause ? String(nestedCause) : null
  const details = nestedMessage ? `${message} (cause: ${nestedMessage})` : message
  const hostNotFound = /ENOTFOUND/i.test(details)
  const hint = hostNotFound
    ? " DNS could not resolve the Supabase hostname. Confirm the exact Project URL from Supabase Dashboard > Settings > API (format: https://<project-ref>.supabase.co)."
    : ""

  return new Error(
    `Supabase ${action} failed due to network/config issue: ${details}. Verify SUPABASE_URL is a valid https URL and your server can reach Supabase.${hint}`
  )
}

function getHeaders(): HeadersInit {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server credentials are missing")
  }

  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    Prefer: "return=representation",
  }
}

function endpoint(table: string): string {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is missing or invalid")
  }

  return `${SUPABASE_URL}/rest/v1/${table}`
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
}

export async function insertSupabaseRow<T extends Record<string, unknown>>(
  table: string,
  payload: T
): Promise<T | null> {
  let response: Response

  try {
    response = await fetch(endpoint(table), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
    })
  } catch (err) {
    throw toNetworkError("insert", err)
  }

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Supabase insert failed (${response.status}): ${details}`)
  }

  const result = (await response.json()) as T[]
  return result[0] ?? null
}

export async function selectSupabaseSingle<T>(
  table: string,
  filters: Record<string, string | number | boolean>
): Promise<T | null> {
  const query = new URLSearchParams({
    select: "*",
    limit: "1",
  })

  Object.entries(filters).forEach(([key, value]) => {
    query.set(key, `eq.${value}`)
  })

  let response: Response

  try {
    response = await fetch(`${endpoint(table)}?${query.toString()}`, {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    })
  } catch (err) {
    throw toNetworkError("select", err)
  }

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Supabase select failed (${response.status}): ${details}`)
  }

  const result = (await response.json()) as T[]
  return result[0] ?? null
}

export async function selectSupabaseRows<T>(input: {
  table: string
  filters?: Record<string, string | number | boolean>
  limit?: number
  orderBy?: string
  ascending?: boolean
}): Promise<T[]> {
  const query = new URLSearchParams({
    select: "*",
    limit: String(input.limit ?? 20),
  })

  Object.entries(input.filters ?? {}).forEach(([key, value]) => {
    query.set(key, `eq.${value}`)
  })

  if (input.orderBy) {
    query.set("order", `${input.orderBy}.${input.ascending ? "asc" : "desc"}`)
  }

  let response: Response

  try {
    response = await fetch(`${endpoint(input.table)}?${query.toString()}`, {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    })
  } catch (err) {
    throw toNetworkError("select", err)
  }

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Supabase select failed (${response.status}): ${details}`)
  }

  return (await response.json()) as T[]
}

export async function updateSupabaseRows<T extends Record<string, unknown>>(input: {
  table: string
  filters: Record<string, string | number | boolean>
  payload: Record<string, unknown>
}): Promise<T[]> {
  const query = new URLSearchParams({
    select: "*",
  })

  Object.entries(input.filters).forEach(([key, value]) => {
    query.set(key, `eq.${value}`)
  })

  let response: Response

  try {
    response = await fetch(`${endpoint(input.table)}?${query.toString()}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(input.payload),
      cache: "no-store",
    })
  } catch (err) {
    throw toNetworkError("update", err)
  }

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Supabase update failed (${response.status}): ${details}`)
  }

  return (await response.json()) as T[]
}

export async function deleteSupabaseRows<T>(input: {
  table: string
  filters: Record<string, string | number | boolean>
}): Promise<T[]> {
  const query = new URLSearchParams({
    select: "*",
  })

  Object.entries(input.filters).forEach(([key, value]) => {
    query.set(key, `eq.${value}`)
  })

  let response: Response

  try {
    response = await fetch(`${endpoint(input.table)}?${query.toString()}`, {
      method: "DELETE",
      headers: getHeaders(),
      cache: "no-store",
    })
  } catch (err) {
    throw toNetworkError("delete", err)
  }

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Supabase delete failed (${response.status}): ${details}`)
  }

  return (await response.json()) as T[]
}
