import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"

import { authOptions } from "@/lib/server/auth-options"
import {
  getMemberNameById,
  listAttendanceLogs,
  logAttendance,
} from "@/lib/server/attendance-service"
import { hasPermission, PERMISSIONS, type Role } from "@/lib/server/rbac"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.ATTENDANCE_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const limitParam = Number(url.searchParams.get("limit") ?? "20")
  const branchCode =
    url.searchParams.get("branchCode")?.trim() || session.user.branchCode || "DUM"

  const startDate = url.searchParams.get("start") ?? undefined
  const endDate = url.searchParams.get("end") ?? undefined
  const startTime = url.searchParams.get("startTime") ?? undefined
  const endTime = url.searchParams.get("endTime") ?? undefined
  const eventQuery = url.searchParams.get("event") ?? undefined
  const exportFormat = url.searchParams.get("export") ?? undefined

  const opts = {
    branchCode,
    limit: Number.isFinite(limitParam) ? limitParam : 20,
    startDate,
    endDate,
    startTime,
    endTime,
    eventQuery,
  }

  const result = await listAttendanceLogs(opts)

  if (exportFormat === "csv") {
    // build CSV string
    const rows = result.records ?? []
    const header = ["memberId", "eventCode", "branchCode", "method", "loggedAt"]
    const csvLines = [header.join(",")]
    for (const r of rows) {
      const line = [r.memberId, r.eventCode, r.branchCode, r.method, r.loggedAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
      csvLines.push(line)
    }

    const csv = csvLines.join("\n")

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="attendance-${branchCode}.csv"`,
      },
    })
  }

  if (exportFormat === "excel") {
    // build Excel workbook
    const rows = result.records ?? []
    const data = [
      ["Member ID", "Event Code", "Branch Code", "Method", "Logged At"],
      ...rows.map((r) => [r.memberId, r.eventCode, r.branchCode, r.method, r.loggedAt]),
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance")

    // Generate Excel file as buffer
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="attendance-${branchCode}.xlsx"`,
      },
    })
  }

  if (exportFormat === "pdf") {
    // build PDF document
    const rows = result.records ?? []
    const doc = new jsPDF()

    // Add title
    doc.setFontSize(14)
    doc.text(`Attendance Report - ${branchCode}`, 10, 10)

    // Add table
    const headers = ["Member ID", "Event Code", "Branch Code", "Method", "Logged At"]
    const data = rows.map((r) => [r.memberId, r.eventCode, r.branchCode, r.method, r.loggedAt])

    let yPosition = 20
    const pageHeight = doc.internal.pageSize.getHeight()
    const lineHeight = 7

    // Draw header
    doc.setFontSize(10)
    doc.setFont(undefined, "bold")
    doc.text(headers.join(" | "), 10, yPosition)
    yPosition += lineHeight

    // Draw rows
    doc.setFont(undefined, "normal")
    for (const row of data) {
      if (yPosition > pageHeight - 10) {
        doc.addPage()
        yPosition = 10
      }
      doc.text(row.join(" | "), 10, yPosition)
      yPosition += lineHeight
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="attendance-${branchCode}.pdf"`,
      },
    })
  }

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "") as Role

  if (!hasPermission(role, PERMISSIONS.ATTENDANCE_LOG)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json()) as {
    memberId?: string
    memberName?: string
    eventCode?: string
    branchCode?: string
    method?: "qr" | "manual"
    sourceCode?: string
    loggedAt?: string
  }

  let memberId = body.memberId?.trim() ?? ""

  if (!memberId && body.method === "qr" && body.sourceCode) {
    try {
      const parsed = JSON.parse(body.sourceCode) as { memberId?: string }
      if (typeof parsed.memberId === "string") {
        memberId = parsed.memberId.trim()
      }
    } catch {
      // keep memberId empty and fail validation below
    }
  }

  const branchCode = body.branchCode?.trim() || session.user.branchCode || "DUM"
  const memberName = body.memberName?.trim() ?? ""
  const eventCode = body.eventCode?.trim() ?? ""
  const sourceCode = body.sourceCode?.trim() ?? ""

  if (!memberId || !eventCode || !body.method || !sourceCode) {
    return NextResponse.json(
      { error: "memberId, eventCode, method, and sourceCode are required" },
      { status: 400 }
    )
  }

  const resolvedMemberName = await getMemberNameById(memberId)

  if (memberName && resolvedMemberName) {
    const normalizedProvidedName = memberName.trim().toLowerCase()
    const normalizedMemberName = resolvedMemberName.trim().toLowerCase()

    if (normalizedProvidedName !== normalizedMemberName) {
      return NextResponse.json(
        {
          error: "Name confirmation does not match member record.",
        },
        { status: 400 }
      )
    }
  }

  const result = await logAttendance({
    memberId,
    eventCode,
    branchCode,
    method: body.method,
    sourceCode,
    loggedByUserId: session.user.id,
    loggedAt: body.loggedAt,
  })

  return NextResponse.json({
    ...result,
    memberName: resolvedMemberName ?? memberName ?? memberId,
  })
}
