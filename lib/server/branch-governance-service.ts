import { randomUUID } from "crypto"

import {
  insertSupabaseRow,
  isSupabaseConfigured,
  selectSupabaseSingle,
  selectSupabaseRows,
  updateSupabaseRows,
} from "@/lib/server/supabase-admin"

export type BranchRecognitionStatus = "pending" | "approved" | "rejected"

export type BranchRecognitionRequest = {
  id: string
  branchCode: string
  requestedByUserId: string
  requestedByRole: string
  note: string
  status: BranchRecognitionStatus
  createdAt: string
  approvedByUserId: string | null
  approvedAt: string | null
}

export type BranchAnnouncement = {
  id: string
  branchCode: string
  title: string
  message: string
  createdByUserId: string
  createdByRole: string
  createdAt: string
}

const inMemoryRecognition: BranchRecognitionRequest[] = []
const inMemoryAnnouncements: BranchAnnouncement[] = []
const inMemoryBranches = new Map<string, { branchCode: string; branchName: string }>()

function defaultBranchName(branchCode: string): string {
  const normalized = branchCode.trim().toUpperCase()
  return `JA1 ${normalized}`
}

export async function createBranchIfMissing(input: {
  branchCode: string
  branchName?: string
}): Promise<{ branchCode: string; branchName: string; created: boolean }> {
  const branchCode = input.branchCode.trim().toUpperCase()
  const branchName = (input.branchName?.trim() || defaultBranchName(branchCode)).slice(0, 120)

  if (isSupabaseConfigured()) {
    const existing = await selectSupabaseSingle<{ id: string; branch_code: string; branch_name: string }>(
      "branches",
      { branch_code: branchCode }
    )

    if (existing) {
      return {
        branchCode: existing.branch_code,
        branchName: existing.branch_name,
        created: false,
      }
    }

    await insertSupabaseRow("branches", {
      branch_code: branchCode,
      branch_name: branchName,
    })

    return { branchCode, branchName, created: true }
  }

  const existing = inMemoryBranches.get(branchCode)
  if (existing) {
    return { branchCode: existing.branchCode, branchName: existing.branchName, created: false }
  }

  inMemoryBranches.set(branchCode, { branchCode, branchName })
  return { branchCode, branchName, created: true }
}

export async function createBranchRecognitionRequest(input: {
  branchCode: string
  requestedByUserId: string
  requestedByRole: string
  note: string
}): Promise<BranchRecognitionRequest> {
  const request: BranchRecognitionRequest = {
    id: randomUUID(),
    branchCode: input.branchCode.trim().toUpperCase(),
    requestedByUserId: input.requestedByUserId,
    requestedByRole: input.requestedByRole,
    note: input.note.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
    approvedByUserId: null,
    approvedAt: null,
  }

  if (isSupabaseConfigured()) {
    await insertSupabaseRow("branch_recognition_requests", {
      id: request.id,
      branch_code: request.branchCode,
      requested_by_user_id: request.requestedByUserId,
      requested_by_role: request.requestedByRole,
      note: request.note,
      status: request.status,
      created_at: request.createdAt,
      approved_by_user_id: request.approvedByUserId,
      approved_at: request.approvedAt,
    })
  } else {
    inMemoryRecognition.push(request)
  }

  return request
}

export async function listBranchRecognitionRequests(input: {
  branchCode?: string
  status?: BranchRecognitionStatus
}): Promise<BranchRecognitionRequest[]> {
  if (isSupabaseConfigured()) {
    const filters: Record<string, string | number | boolean> = {}
    if (input.branchCode) filters.branch_code = input.branchCode.toUpperCase()
    if (input.status) filters.status = input.status

    const rows = await selectSupabaseRows<{
      id: string
      branch_code: string
      requested_by_user_id: string
      requested_by_role: string
      note: string
      status: BranchRecognitionStatus
      created_at: string
      approved_by_user_id: string | null
      approved_at: string | null
    }>({
      table: "branch_recognition_requests",
      filters,
      limit: 200,
      orderBy: "created_at",
      ascending: false,
    })

    return rows.map((row) => ({
      id: row.id,
      branchCode: row.branch_code,
      requestedByUserId: row.requested_by_user_id,
      requestedByRole: row.requested_by_role,
      note: row.note,
      status: row.status,
      createdAt: row.created_at,
      approvedByUserId: row.approved_by_user_id,
      approvedAt: row.approved_at,
    }))
  }

  return inMemoryRecognition
    .filter((entry) => (input.branchCode ? entry.branchCode === input.branchCode.toUpperCase() : true))
    .filter((entry) => (input.status ? entry.status === input.status : true))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function approveBranchRecognitionRequest(input: {
  requestId: string
  approvedByUserId: string
}): Promise<BranchRecognitionRequest> {
  const approvedAt = new Date().toISOString()

  if (isSupabaseConfigured()) {
    const updated = await updateSupabaseRows<{
      id: string
      branch_code: string
      requested_by_user_id: string
      requested_by_role: string
      note: string
      status: BranchRecognitionStatus
      created_at: string
      approved_by_user_id: string | null
      approved_at: string | null
    }>({
      table: "branch_recognition_requests",
      filters: { id: input.requestId },
      payload: {
        status: "approved",
        approved_by_user_id: input.approvedByUserId,
        approved_at: approvedAt,
      },
    })

    const row = updated[0]
    if (!row) {
      throw new Error("Request not found.")
    }

    await createBranchIfMissing({
      branchCode: row.branch_code,
      branchName: defaultBranchName(row.branch_code),
    })

    return {
      id: row.id,
      branchCode: row.branch_code,
      requestedByUserId: row.requested_by_user_id,
      requestedByRole: row.requested_by_role,
      note: row.note,
      status: row.status,
      createdAt: row.created_at,
      approvedByUserId: row.approved_by_user_id,
      approvedAt: row.approved_at,
    }
  }

  const request = inMemoryRecognition.find((entry) => entry.id === input.requestId)
  if (!request) {
    throw new Error("Request not found.")
  }

  request.status = "approved"
  request.approvedByUserId = input.approvedByUserId
  request.approvedAt = approvedAt

  await createBranchIfMissing({
    branchCode: request.branchCode,
    branchName: defaultBranchName(request.branchCode),
  })

  return request
}

export async function createBranchAnnouncement(input: {
  branchCode: string
  title: string
  message: string
  createdByUserId: string
  createdByRole: string
}): Promise<BranchAnnouncement> {
  const announcement: BranchAnnouncement = {
    id: randomUUID(),
    branchCode: input.branchCode.trim().toUpperCase(),
    title: input.title.trim(),
    message: input.message.trim(),
    createdByUserId: input.createdByUserId,
    createdByRole: input.createdByRole,
    createdAt: new Date().toISOString(),
  }

  if (isSupabaseConfigured()) {
    await insertSupabaseRow("branch_announcements", {
      id: announcement.id,
      branch_code: announcement.branchCode,
      title: announcement.title,
      message: announcement.message,
      created_by_user_id: announcement.createdByUserId,
      created_by_role: announcement.createdByRole,
      created_at: announcement.createdAt,
    })
  } else {
    inMemoryAnnouncements.push(announcement)
  }

  return announcement
}

export async function listBranchAnnouncements(input: {
  branchCode?: string
}): Promise<BranchAnnouncement[]> {
  if (isSupabaseConfigured()) {
    const filters: Record<string, string | number | boolean> = {}
    if (input.branchCode) filters.branch_code = input.branchCode.toUpperCase()

    const rows = await selectSupabaseRows<{
      id: string
      branch_code: string
      title: string
      message: string
      created_by_user_id: string
      created_by_role: string
      created_at: string
    }>({
      table: "branch_announcements",
      filters,
      limit: 200,
      orderBy: "created_at",
      ascending: false,
    })

    return rows.map((row) => ({
      id: row.id,
      branchCode: row.branch_code,
      title: row.title,
      message: row.message,
      createdByUserId: row.created_by_user_id,
      createdByRole: row.created_by_role,
      createdAt: row.created_at,
    }))
  }

  return inMemoryAnnouncements
    .filter((entry) => (input.branchCode ? entry.branchCode === input.branchCode.toUpperCase() : true))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
