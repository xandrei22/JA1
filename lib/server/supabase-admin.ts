const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    throw new Error("SUPABASE_URL is missing")
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
  const response = await fetch(endpoint(table), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store",
  })

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

  const response = await fetch(`${endpoint(table)}?${query.toString()}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  })

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

  const response = await fetch(`${endpoint(input.table)}?${query.toString()}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  })

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

  const response = await fetch(`${endpoint(input.table)}?${query.toString()}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(input.payload),
    cache: "no-store",
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Supabase update failed (${response.status}): ${details}`)
  }

  return (await response.json()) as T[]
}
