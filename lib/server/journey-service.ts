import { randomUUID } from "crypto"

import {
  isSupabaseConfigured,
  insertSupabaseRow,
  selectSupabaseRows,
  selectSupabaseSingle,
  updateSupabaseRows,
} from "@/lib/server/supabase-admin"
import { type AgeGroupLevel, AGE_GROUP_LEVELS } from "@/lib/age-group"

export type JourneyInvitationStatus = "pending" | "accepted" | "declined"

export type JourneyInvitation = {
  id: string
  invitedEmail: string
  ageGroup: AgeGroupLevel
  invitedByUserId: string
  invitedByRole: string
  status: JourneyInvitationStatus
  createdAt: string
  acceptedAt: string | null
}

export type JourneyMembership = {
  id: string
  userEmail: string
  ageGroup: AgeGroupLevel
  invitationId: string
  joinedAt: string
}

const inMemoryInvitations: JourneyInvitation[] = []
const inMemoryMemberships: JourneyMembership[] = []

function isMissingSupabaseTableError(error: unknown, tableName: string): boolean {
  if (!(error instanceof Error)) return false

  return (
    error.message.includes("PGRST205") &&
    error.message.includes(`public.${tableName}`)
  )
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isAgeGroup(value: string): value is AgeGroupLevel {
  return Object.values(AGE_GROUP_LEVELS).includes(value as AgeGroupLevel)
}

export function validateAgeGroup(value: string): AgeGroupLevel {
  const normalized = value.trim().toUpperCase()
  if (!isAgeGroup(normalized)) {
    throw new Error("Invalid age group")
  }

  return normalized
}

export async function createJourneyInvitation(input: {
  invitedEmail: string
  ageGroup: AgeGroupLevel
  invitedByUserId: string
  invitedByRole: string
}): Promise<JourneyInvitation> {
  const now = new Date().toISOString()
  const invitation: JourneyInvitation = {
    id: randomUUID(),
    invitedEmail: normalizeEmail(input.invitedEmail),
    ageGroup: input.ageGroup,
    invitedByUserId: input.invitedByUserId,
    invitedByRole: input.invitedByRole,
    status: "pending",
    createdAt: now,
    acceptedAt: null,
  }

  if (isSupabaseConfigured()) {
    try {
      await insertSupabaseRow("journey_invitations", {
        id: invitation.id,
        invited_email: invitation.invitedEmail,
        age_group: invitation.ageGroup,
        invited_by_user_id: invitation.invitedByUserId,
        invited_by_role: invitation.invitedByRole,
        status: invitation.status,
        created_at: invitation.createdAt,
        accepted_at: invitation.acceptedAt,
      })
      return invitation
    } catch (error) {
      if (
        !isMissingSupabaseTableError(error, "journey_invitations") &&
        !isMissingSupabaseTableError(error, "journey_memberships")
      ) {
        throw error
      }
    }
  }

  {
    inMemoryInvitations.push(invitation)
  }

  return invitation
}

export async function listJourneyInvitationsForEmail(email: string): Promise<JourneyInvitation[]> {
  const invitedEmail = normalizeEmail(email)

  if (isSupabaseConfigured()) {
    try {
      const rows = await selectSupabaseRows<{
        id: string
        invited_email: string
        age_group: string
        invited_by_user_id: string
        invited_by_role: string
        status: JourneyInvitationStatus
        created_at: string
        accepted_at: string | null
      }>({
        table: "journey_invitations",
        filters: { invited_email: invitedEmail },
        limit: 100,
        orderBy: "created_at",
        ascending: false,
      })

      return rows
        .filter((row) => isAgeGroup(row.age_group))
        .map((row) => ({
          id: row.id,
          invitedEmail: row.invited_email,
          ageGroup: row.age_group as AgeGroupLevel,
          invitedByUserId: row.invited_by_user_id,
          invitedByRole: row.invited_by_role,
          status: row.status,
          createdAt: row.created_at,
          acceptedAt: row.accepted_at,
        }))
    } catch (error) {
      if (!isMissingSupabaseTableError(error, "journey_invitations")) {
        throw error
      }
    }
  }

  return inMemoryInvitations
    .filter((entry) => entry.invitedEmail === invitedEmail)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function listJourneyInvitationsByInviter(invitedByUserId: string): Promise<JourneyInvitation[]> {
  if (isSupabaseConfigured()) {
    try {
      const rows = await selectSupabaseRows<{
        id: string
        invited_email: string
        age_group: string
        invited_by_user_id: string
        invited_by_role: string
        status: JourneyInvitationStatus
        created_at: string
        accepted_at: string | null
      }>({
        table: "journey_invitations",
        filters: { invited_by_user_id: invitedByUserId },
        limit: 100,
        orderBy: "created_at",
        ascending: false,
      })

      return rows
        .filter((row) => isAgeGroup(row.age_group))
        .map((row) => ({
          id: row.id,
          invitedEmail: row.invited_email,
          ageGroup: row.age_group as AgeGroupLevel,
          invitedByUserId: row.invited_by_user_id,
          invitedByRole: row.invited_by_role,
          status: row.status,
          createdAt: row.created_at,
          acceptedAt: row.accepted_at,
        }))
    } catch (error) {
      if (!isMissingSupabaseTableError(error, "journey_invitations")) {
        throw error
      }
    }
  }

  return inMemoryInvitations
    .filter((entry) => entry.invitedByUserId === invitedByUserId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getJourneyMembershipByEmail(
  userEmail: string
): Promise<JourneyMembership | null> {
  const email = normalizeEmail(userEmail)

  if (isSupabaseConfigured()) {
    try {
      const row = await selectSupabaseSingle<{
        id: string
        user_email: string
        age_group: string
        invitation_id: string
        joined_at: string
      }>("journey_memberships", {
        user_email: email,
      })

      if (!row || !isAgeGroup(row.age_group)) {
        return null
      }

      return {
        id: row.id,
        userEmail: row.user_email,
        ageGroup: row.age_group,
        invitationId: row.invitation_id,
        joinedAt: row.joined_at,
      }
    } catch (error) {
      if (!isMissingSupabaseTableError(error, "journey_memberships")) {
        throw error
      }
    }
  }

  return inMemoryMemberships.find((entry) => entry.userEmail === email) ?? null
}

export async function acceptJourneyInvitation(input: {
  invitationId: string
  userEmail: string
  userAgeGroup: string | null
}): Promise<JourneyMembership> {
  if (!input.userAgeGroup || !isAgeGroup(input.userAgeGroup)) {
    throw new Error("Your account does not have a valid age group.")
  }

  const email = normalizeEmail(input.userEmail)

  const existingMembership = await getJourneyMembershipByEmail(email)
  if (existingMembership) {
    return existingMembership
  }

  const now = new Date().toISOString()

  if (isSupabaseConfigured()) {
    try {
      const invitationRow = await selectSupabaseSingle<{
        id: string
        invited_email: string
        age_group: string
        status: JourneyInvitationStatus
      }>("journey_invitations", {
        id: input.invitationId,
      })

      if (!invitationRow || !isAgeGroup(invitationRow.age_group)) {
        throw new Error("Invitation not found.")
      }

      if (invitationRow.invited_email !== email) {
        throw new Error("Invitation does not belong to your account.")
      }

      if (invitationRow.status !== "pending") {
        throw new Error("Invitation is no longer pending.")
      }

      if (invitationRow.age_group !== input.userAgeGroup) {
        throw new Error("Your age group does not match this invitation.")
      }

      await updateSupabaseRows({
        table: "journey_invitations",
        filters: { id: input.invitationId },
        payload: {
          status: "accepted",
          accepted_at: now,
        },
      })

      const membershipId = randomUUID()
      await insertSupabaseRow("journey_memberships", {
        id: membershipId,
        user_email: email,
        age_group: input.userAgeGroup,
        invitation_id: input.invitationId,
        joined_at: now,
      })

      return {
        id: membershipId,
        userEmail: email,
        ageGroup: input.userAgeGroup,
        invitationId: input.invitationId,
        joinedAt: now,
      }
    } catch (error) {
      const missingJourneyTable =
        isMissingSupabaseTableError(error, "journey_invitations") ||
        isMissingSupabaseTableError(error, "journey_memberships")

      if (!missingJourneyTable) {
        throw error
      }
    }
  }

  const invitation = inMemoryInvitations.find((entry) => entry.id === input.invitationId)

  if (!invitation) {
    throw new Error("Invitation not found.")
  }

  if (invitation.invitedEmail !== email) {
    throw new Error("Invitation does not belong to your account.")
  }

  if (invitation.status !== "pending") {
    throw new Error("Invitation is no longer pending.")
  }

  if (invitation.ageGroup !== input.userAgeGroup) {
    throw new Error("Your age group does not match this invitation.")
  }

  invitation.status = "accepted"
  invitation.acceptedAt = now

  const membership: JourneyMembership = {
    id: randomUUID(),
    userEmail: email,
    ageGroup: invitation.ageGroup,
    invitationId: invitation.id,
    joinedAt: now,
  }

  inMemoryMemberships.push(membership)
  return membership
}
