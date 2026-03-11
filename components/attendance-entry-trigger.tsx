"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { QrCode, Keyboard } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"


export function AttendanceEntryTrigger() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigateToScan = useCallback(() => {
    // client-side navigation to dashboard attendance scan
    router.push("/dashboard?section=attendance-log&entry=scan")
    // dispatch event shortly after navigation so mounted scanner opens if needed
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ja1:open-scanner"))
      }
    }, 250)
  }, [router])

  const navigateToManual = useCallback(() => {
    router.push("/dashboard?section=attendance-log&entry=manual")
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ja1:open-manual"))
      }
    }, 250)
  }, [router])
  function openScanner() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ja1:open-scanner"))
    }
  }

  function openManual() {
    if (typeof window === "undefined") return
    window.dispatchEvent(new CustomEvent("ja1:open-manual"))
  }

  // If the user is on another page and opens the scanner, navigate to the
  // dashboard attendance section so `MemberQrScanner` mounts and opens.
  function openScannerOrNavigate() {
    if (typeof window === "undefined") return
    window.dispatchEvent(new CustomEvent("ja1:open-scanner"))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="outline" aria-label="Attendance entry options" title="Attendance entry options">
          <QrCode className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          {/* use a button here so we can dispatch an event to open the scanner modal */}
          <button type="button" onClick={openScannerOrNavigate} className="flex items-center gap-2 w-full text-left">
            <QrCode className="size-4" />
            Scan QR Code
          </button>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <button type="button" onClick={openManual} className="flex items-center gap-2 w-full text-left">
            <Keyboard className="size-4" />
            Enter Manual Code
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
