import { authOptions } from "@/lib/server/auth-options"
import { getJourneyMembershipByEmail } from "@/lib/server/journey-service"
import {
  hasDirectJourneyAccess,
  hasPermission,
  PERMISSIONS,
  type Role,
} from "@/lib/server/rbac"
import { getServerSession } from "next-auth"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function JourneyPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const role = (session.user.role ?? "") as Role
  const directJourneyAccess = hasDirectJourneyAccess(role)

  if (!hasPermission(role, PERMISSIONS.JOURNEY_ACCESS)) {
    redirect("/dashboard?section=overview")
  }

  if (!session.user.email) {
    redirect("/dashboard?section=journey")
  }

  const membership = await getJourneyMembershipByEmail(session.user.email)

  if (!membership && !directJourneyAccess) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-3xl px-4 py-16">
        <div className="rounded-xl border bg-card p-6 text-center">
          <h1 className="text-3xl font-bold">Journey Access Required</h1>
          <p className="mt-3 text-muted-foreground">
            You need an accepted group invitation to access Journey.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Make sure your invitation age-group matches your account age-group.
          </p>
          <Link href="/dashboard?section=journey" className="mt-5 inline-block text-primary underline">
            Go to Journey Requests
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl px-4 py-16">
      <div className="rounded-xl border bg-card p-6">
        <h1 className="text-3xl font-bold">Journey</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome to your Journey track.
        </p>

        {membership ? (
          <div className="mt-5 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">Email:</span> {membership.userEmail}
            </p>
            <p>
              <span className="font-medium text-foreground">Group:</span> {membership.ageGroup}
            </p>
            <p>
              <span className="font-medium text-foreground">Joined:</span> {new Date(membership.joinedAt).toLocaleString()}
            </p>
            <p>
              <span className="font-medium text-foreground">Invitation ID:</span> {membership.invitationId}
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border p-4 text-sm text-muted-foreground">
            <p>
              You have direct Journey access as <span className="font-medium text-foreground">{role}</span>.
            </p>
            <p className="mt-1">No invitation acceptance is required for your leadership role.</p>
          </div>
        )}
      </div>
    </div>
  )
}
