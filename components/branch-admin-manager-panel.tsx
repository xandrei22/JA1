"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"

type CreateAdminResponse = {
  id: string
  email: string
  fullName: string
  branchCode: string
  role: string
  message: string
}

type ManagedAdmin = {
  id: string
  email: string
  fullName: string
  branchCode: string
  role: string
  source: "supabase" | "local"
}

export function BranchAdminManagerPanel({ branchCode }: { branchCode: string }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [activeBranch, setActiveBranch] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("Create a new branch admin account.")
  const [userRole, setUserRole] = useState<string | null>(null)
  const [createdAdmin, setCreatedAdmin] = useState<CreateAdminResponse | null>(null)
  const [admins, setAdmins] = useState<ManagedAdmin[]>([])
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFullName, setEditFullName] = useState("")
  const [editBranchCode, setEditBranchCode] = useState("")

  async function loadAdmins() {
    setIsLoadingAdmins(true)
    try {
      const res = await fetch("/api/admin/create", {
        method: "GET",
        cache: "no-store",
      })
      const json = (await res.json().catch(() => ({}))) as {
        records?: ManagedAdmin[]
        error?: string
      }
      if (!res.ok) {
        if (json.error) setMessage(json.error)
        setAdmins([])
        return
      }
      setAdmins(json.records ?? [])
    } catch {
      setAdmins([])
    } finally {
      setIsLoadingAdmins(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch("/api/me")
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        const role = json?.user?.role ?? null
        setUserRole(role)

        if (role === "vip_chairman" || role === "supervising_pastor" || role === "branch_admin") {
          await loadAdmins()
        }
      } catch {
        // noop
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const canCreate =
    userRole === "vip_chairman" ||
    userRole === "supervising_pastor" ||
    userRole === "branch_admin"
  const canManage = userRole === "vip_chairman" || userRole === "supervising_pastor"

  // Hide this component entirely for users who are not allowed to create admins.
  if (!canCreate) return null

  async function handleCreateAdmin() {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()
    const normalizedName = fullName.trim()

    if (!normalizedEmail || !normalizedPassword || !normalizedName) {
      setMessage("Email, password, and full name are required.")
      return
    }

    if (normalizedPassword.length < 8) {
      setMessage("Password must be at least 8 characters.")
      return
    }

    setIsLoading(true)
    setMessage("Creating branch admin account...")

    const response = await fetch("/api/admin/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password: normalizedPassword,
        fullName: normalizedName,
        branchCode: activeBranch.trim() || branchCode,
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as
      | CreateAdminResponse
      | { error?: string }

    setIsLoading(false)

    if (!response.ok) {
      setMessage((payload as { error?: string }).error ?? "Failed to create branch admin.")
      await loadAdmins()
      return
    }

    const adminData = payload as CreateAdminResponse
    setCreatedAdmin(adminData)
    setMessage(adminData.message)
    setEmail("")
    setPassword("")
    setFullName("")
    await loadAdmins()
  }

  function startEdit(row: ManagedAdmin) {
    setEditingId(row.id)
    setEditFullName(row.fullName)
    setEditBranchCode(row.branchCode)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditFullName("")
    setEditBranchCode("")
  }

  async function handleSaveEdit(id: string) {
    const normalizedName = editFullName.trim()
    const normalizedBranch = editBranchCode.trim().toUpperCase()

    if (!normalizedName || !normalizedBranch) {
      setMessage("Full name and branch code are required for update.")
      return
    }

    setIsLoading(true)
    const res = await fetch("/api/admin/create", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        fullName: normalizedName,
        branchCode: normalizedBranch,
      }),
    })

    const json = (await res.json().catch(() => ({}))) as { error?: string }
    setIsLoading(false)

    if (!res.ok) {
      setMessage(json.error ?? "Failed to update branch admin.")
      return
    }

    setMessage("Branch admin updated successfully.")
    cancelEdit()
    await loadAdmins()
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this branch admin account?")
    if (!ok) return

    setIsLoading(true)
    const res = await fetch(`/api/admin/create?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    setIsLoading(false)

    if (!res.ok) {
      setMessage(json.error ?? "Failed to delete branch admin.")
      return
    }

    setMessage("Branch admin deleted successfully.")
    await loadAdmins()
  }

  return (
    <div id="admin-management" className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold">Branch Admin Management</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Create new branch admin accounts. Branch admins can manage members and attendance for their branch.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="mb-1 text-sm font-medium">Email</p>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@ja1.local"
            disabled={isLoading}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Full Name</p>
          <Input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="e.g. Branch Admin"
            disabled={isLoading}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Password</p>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Branch Code</p>
          <Input
            value={activeBranch}
            onChange={(event) => setActiveBranch(event.target.value)}
            placeholder="e.g. CODE"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Button
          onClick={() => void handleCreateAdmin()}
          disabled={isLoading}
        >
          {isLoading ? "Creating..." : "Create Branch Admin"}
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{message}</p>

      {createdAdmin && (
        <div className="mt-4 rounded-lg border bg-green-50 p-4 dark:bg-green-950">
          <h4 className="font-semibold text-green-900 dark:text-green-100">
            Branch Admin Created
          </h4>
          <div className="mt-2 space-y-1 text-sm text-green-800 dark:text-green-200">
            <p>
              <strong>Email:</strong> {createdAdmin.email}
            </p>
            <p>
              <strong>Name:</strong> {createdAdmin.fullName}
            </p>
            <p>
              <strong>Branch:</strong> {createdAdmin.branchCode}
            </p>
            <p>
              <strong>Role:</strong> {createdAdmin.role}
            </p>
          </div>
          <p className="mt-3 text-xs text-green-700 dark:text-green-300">
            The admin can now log in with their email and password.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-lg border">
        <div className="border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Branch Admin Accounts</h4>
          <p className="text-xs text-muted-foreground">
            Super admins can edit and delete branch admin accounts.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">Full Name</th>
                <th className="px-3 py-2 text-left font-medium">Branch Code</th>
                <th className="px-3 py-2 text-left font-medium">Source</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingAdmins ? (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={5}>Loading admins...</td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={5}>No branch admins found.</td>
                </tr>
              ) : (
                admins.map((row) => {
                  const isEditing = editingId === row.id
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2">{row.email}</td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} disabled={isLoading} />
                        ) : (
                          row.fullName
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <Input value={editBranchCode} onChange={(e) => setEditBranchCode(e.target.value)} disabled={isLoading} />
                        ) : (
                          row.branchCode
                        )}
                      </td>
                      <td className="px-3 py-2 uppercase text-xs text-muted-foreground">{row.source}</td>
                      <td className="px-3 py-2">
                        {canManage ? (
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <Button size="sm" onClick={() => void handleSaveEdit(row.id)} disabled={isLoading}>Save</Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isLoading}>Cancel</Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => startEdit(row)} disabled={isLoading}>Edit</Button>
                                <Button size="sm" variant="destructive" onClick={() => void handleDelete(row.id)} disabled={isLoading}>Delete</Button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">View only</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
