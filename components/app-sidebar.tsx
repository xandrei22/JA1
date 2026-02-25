"use client"

import * as React from "react"
import {
  Bell,
  Building2,
  ClipboardCheck,
  Command,
  LayoutDashboard,
  LifeBuoy,
  ShieldCheck,
  Send,
  Settings2,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type AppSidebarUser = {
  name: string
  email: string
  role: string
  branchCode: string | null
  ageGroup: string | null
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: AppSidebarUser
  permissions: string[]
}

function hasPermission(permissions: string[], permission: string) {
  return permissions.includes(permission)
}

export function AppSidebar({ user, permissions, ...props }: AppSidebarProps) {
  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard?section=dashboard",
      icon: LayoutDashboard,
    },
    ...(hasPermission(permissions, "attendance:log") || hasPermission(permissions, "attendance:view")
      ? [
          {
            title: "Attendance",
            url: "#",
            icon: ClipboardCheck,
            items: [
              ...(hasPermission(permissions, "attendance:log") ? [{ title: "Log Attendance", url: "/dashboard?section=attendance-log" }] : []),
              ...(hasPermission(permissions, "attendance:view") ? [{ title: "View Attendance", url: "/dashboard?section=attendance-view" }] : []),
            ],
          },
        ]
      : []),
    ...(hasPermission(permissions, "member:monitor") || hasPermission(permissions, "age_group:compliance_monitor")
      ? [
          {
            title: "Monitoring",
            url: "#",
            icon: Users,
            items: [
              ...(hasPermission(permissions, "member:monitor")
                ? [{ title: "Members Scope", url: "/dashboard?section=member-monitor" }]
                : []),
              ...(hasPermission(permissions, "age_group:compliance_monitor")
                ? [{ title: "Age Compliance", url: "/dashboard?section=age-compliance" }]
                : []),
            ],
          },
        ]
      : []),
    ...(hasPermission(permissions, "member:manage")
      ? [
          {
            title: "Members",
            url: "#",
            icon: Users,
            items: [
              { title: "Manage Members", url: "/dashboard?section=member-management" },
              { title: "Reset Credentials", url: "/dashboard?section=member-management" },
            ],
          },
        ]
      : []),
    ...(hasPermission(permissions, "age_group:manage")
      ? [
          {
            title: "Age Groups",
            url: "#",
            icon: Users,
            items: [{ title: "Manage Age Groups", url: "/dashboard?section=age-group-management" }],
          },
        ]
      : []),
    ...(hasPermission(permissions, "branch:manage") || hasPermission(permissions, "satellite:view") || hasPermission(permissions, "first_timers:view")
      ? [
          {
            title: "Branches",
            url: "#",
            icon: Building2,
            items: [
              ...(hasPermission(permissions, "branch:manage") ? [{ title: "Manage Branches", url: "/dashboard?section=branch-management" }] : []),
              ...(hasPermission(permissions, "satellite:view") ? [{ title: "Satellite Centers", url: "/dashboard?section=satellite-view" }] : []),
              ...(hasPermission(permissions, "first_timers:view") ? [{ title: "First Timers", url: "/dashboard?section=first-timers-view" }] : []),
            ],
          },
        ]
      : []),
    ...(hasPermission(permissions, "branch:recognition_request") || hasPermission(permissions, "branch:approve")
      ? [
          {
            title: "Governance",
            url: "#",
            icon: Building2,
            items: [
              ...(hasPermission(permissions, "branch:recognition_request")
                ? [{ title: "Branch Recognition", url: "/dashboard?section=branch-recognition" }]
                : []),
              ...(hasPermission(permissions, "branch:approve")
                ? [{ title: "Approvals", url: "/dashboard?section=branch-approvals" }]
                : []),
            ],
          },
        ]
      : []),
    ...(hasPermission(permissions, "announcement:view") || hasPermission(permissions, "announcement:manage")
      ? [
          {
            title: "Announcements",
            url: "#",
            icon: Bell,
            items: [
              { title: "Event Board", url: "/dashboard?section=announcements" },
            ],
          },
        ]
      : []),
    ...(hasPermission(permissions, "settings:manage") || hasPermission(permissions, "system:manage")
      ? [
          {
            title: "Administration",
            url: "#",
            icon: Settings2,
            items: [
              ...(hasPermission(permissions, "settings:manage") ? [{ title: "Settings", url: "/dashboard?section=settings" }] : []),
              ...(hasPermission(permissions, "system:manage") ? [{ title: "System Controls", url: "/dashboard?section=system-controls" }] : []),
            ],
          },
        ]
      : []),
    ...(hasPermission(permissions, "journey:access") || hasPermission(permissions, "journey:invite")
      ? [
          {
            title: "Journey",
            url: "#",
            icon: ShieldCheck,
            items: [
              ...(hasPermission(permissions, "journey:access")
                ? [{ title: "My Journey", url: "/dashboard?section=journey" }]
                : []),
              ...(hasPermission(permissions, "journey:invite")
                ? [{ title: "Invitations", url: "/dashboard?section=journey-invitations" }]
                : []),
            ],
          },
        ]
      : []),
  ]

  const navSecondary = [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">JA1 Dashboard</span>
                  <span className="truncate text-xs">{user.branchCode ?? "No branch"}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.name,
            email: user.email,
            avatar: "/JA1mlogo.svg",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
