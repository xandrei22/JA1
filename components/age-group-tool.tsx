"use client"

import { Input } from "@/components/ui/input"
import { getAgeGroupDisplayName, resolveAgeGroupFromBirthday } from "@/lib/age-group"
import { useMemo, useState } from "react"

export function AgeGroupTool() {
  const [birthday, setBirthday] = useState("")

  const result = useMemo(() => {
    if (!birthday) return { age: "", group: "", error: "" }

    try {
      const resolved = resolveAgeGroupFromBirthday(birthday)
      return {
        age: String(resolved.age),
        group: getAgeGroupDisplayName(resolved.ageGroup),
        error: "",
      }
    } catch {
      return {
        age: "",
        group: "",
        error: "Invalid birthday.",
      }
    }
  }, [birthday])

  return (
    <div id="age-group-management" className="rounded-xl border bg-card p-5">
      <h3 className="text-lg font-semibold">Age Group Tool</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Calculate member age and age-group level from birthday.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <p className="mb-1 text-sm font-medium">Birthday</p>
          <Input
            type="date"
            value={birthday}
            onChange={(event) => setBirthday(event.target.value)}
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Age</p>
          <Input value={result.age} readOnly />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Age Group</p>
          <Input value={result.group} readOnly />
        </div>
      </div>

      {result.error ? <p className="mt-3 text-sm text-destructive">{result.error}</p> : null}
    </div>
  )
}
