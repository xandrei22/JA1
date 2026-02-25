import { AppSidebar } from "@/components/app-sidebar"
import { MemberQrScanner } from "@/components/member-qr-scanner"
import { authOptions } from "@/lib/server/auth-options"
import { hasPermission, PERMISSIONS, ROLES, type Role } from "@/lib/server/rbac"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

export default async function Page() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const role = (session.user.role as Role) ?? ROLES.AGE_GROUP_LEADER
  const allPermissions = Object.values(PERMISSIONS)
  const allowedPermissions = allPermissions.filter((permission) =>
    hasPermission(role, permission)
  )

  const capabilities = [
    {
      title: "Attendance Logging",
      description: "Record service attendance using QR or backup code workflows.",
      permission: PERMISSIONS.ATTENDANCE_LOG,
    },
    {
      title: "Attendance Reports",
      description: "Review and verify attendance records for your scope.",
      permission: PERMISSIONS.ATTENDANCE_VIEW,
    },
    {
      title: "Member Management",
      description: "Update member profiles and maintain account credentials.",
      permission: PERMISSIONS.MEMBER_MANAGE,
    },
    {
      title: "Age Group Management",
      description: "Manage age-group structure and leadership assignments.",
      permission: PERMISSIONS.AGE_GROUP_MANAGE,
    },
    {
      title: "Branch Management",
      description: "Handle branch-level setup, coverage, and assignments.",
      permission: PERMISSIONS.BRANCH_MANAGE,
    },
    {
      title: "Satellite View",
      description: "View satellite and outreach center ministry data.",
      permission: PERMISSIONS.SATELLITE_VIEW,
    },
    {
      title: "First Timers View",
      description: "Track first-time attendees and follow-up activity.",
      permission: PERMISSIONS.FIRST_TIMER_VIEW,
    },
    {
      title: "Settings Management",
      description: "Configure system and ministry settings.",
      permission: PERMISSIONS.SETTINGS_MANAGE,
    },
    {
      title: "System Administration",
      description: "Control central system-wide administrative functions.",
      permission: PERMISSIONS.SYSTEM_MANAGE,
    },
  ]

  const allowedCapabilities = capabilities.filter((capability) =>
    hasPermission(role, capability.permission)
  )

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: session.user.name ?? "JA1 Member",
          email: session.user.email ?? "",
          role: session.user.role,
          branchCode: session.user.branchCode,
          ageGroup: session.user.ageGroup,
        }}
        permissions={allowedPermissions}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Centralized Ministry Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {session.user.role} · {session.user.branchCode ?? "N/A"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-xl font-semibold">What You Can Do</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Access is based on your role: {session.user.role}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {allowedCapabilities.map((capability) => (
              <div key={capability.title} className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">{capability.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>

          {hasPermission(role, PERMISSIONS.ATTENDANCE_LOG) ? (
            <MemberQrScanner branchCode={session.user.branchCode ?? "DUM"} />
          ) : null}

          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">Your Access Summary</h3>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <p>
                <span className="font-medium text-foreground">Role:</span> {session.user.role}
              </p>
              <p>
                <span className="font-medium text-foreground">Branch:</span> {session.user.branchCode ?? "N/A"}
              </p>
              <p>
                <span className="font-medium text-foreground">Age Group:</span> {session.user.ageGroup ?? "N/A"}
              </p>
              <p>
                <span className="font-medium text-foreground">Permissions:</span> {allowedPermissions.length}
              </p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
