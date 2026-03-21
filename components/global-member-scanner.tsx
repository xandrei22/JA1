"use client"

import React, { useEffect, useState } from "react"

export default function GlobalMemberScanner() {
  const [branchCode, setBranchCode] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Lazy-loaded scanner component
  const [ScannerComp, setScannerComp] = useState<any | null>(null)
  const [mountedScanner, setMountedScanner] = useState(false)
  const [initialEntry, setInitialEntry] = useState<"scan" | "manual" | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch('/api/me')
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        setBranchCode(json?.user?.branchCode ?? 'DUM')
        setName(json?.user?.name ?? null)
      } catch {
        // noop
      } finally {
        if (mounted) setLoaded(true)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    function onOpenScanner() {
      setInitialEntry("scan")
      setMountedScanner(true)
      // dynamically import scanner component when needed
      if (!ScannerComp) {
        import("./member-qr-scanner").then((mod) => {
          setScannerComp(() => mod.MemberQrScanner ?? mod.default ?? mod)
        })
      }
    }

    function onOpenManual() {
      setInitialEntry("manual")
      setMountedScanner(true)
      if (!ScannerComp) {
        import("./member-qr-scanner").then((mod) => {
          setScannerComp(() => mod.MemberQrScanner ?? mod.default ?? mod)
        })
      }
    }

    window.addEventListener("ja1:open-scanner", onOpenScanner as EventListener)
    window.addEventListener("ja1:open-manual", onOpenManual as EventListener)

    return () => {
      window.removeEventListener("ja1:open-scanner", onOpenScanner as EventListener)
      window.removeEventListener("ja1:open-manual", onOpenManual as EventListener)
    }
  }, [ScannerComp])

  // If not mounted for scanning, render nothing (avoids showing UI on every page)
  if (!loaded) return null

  return (
    <>
      {mountedScanner && ScannerComp
        ? React.createElement(ScannerComp, {
            branchCode: branchCode ?? "DUM",
            defaultMemberName: name ?? "",
            initialEntryOption: initialEntry,
          })
        : null}
    </>
  )
}
