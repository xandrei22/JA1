"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Suggestion = { label: string; zip?: string; [k: string]: any }

export default function PhilAddressAutocomplete({
  value,
  onChange,
  className,
  placeholder,
  alwaysShowStructured,
}: {
  value: { address?: string; zip?: string }
  onChange: (v: { address?: string; zip?: string }) => void
  className?: string
  placeholder?: string
  alwaysShowStructured?: boolean
}) {
  const [query, setQuery] = React.useState(value.address ?? "")
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedRegion, setSelectedRegion] = React.useState<string | undefined>(undefined)
  const [selectedProvince, setSelectedProvince] = React.useState<string | undefined>(undefined)
  const [selectedCity, setSelectedCity] = React.useState<string | undefined>(undefined)
  const [selectedBarangay, setSelectedBarangay] = React.useState<string | undefined>(undefined)
  const searchRef = React.useRef<((q: string) => Promise<Suggestion[]>) | null>(null)
  const timerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    // Dynamic import so server build is unaffected.
    let mounted = true
    import("phil-address")
      .then((mod) => {
        // try common exported names
        const fn = (mod && (mod.search || mod.autocomplete || mod.default || mod.suggest || mod.getSuggestions)) as any
        if (mounted && typeof fn === "function") {
          searchRef.current = async (q: string) => {
            try {
              const res = await fn(q)
              // Expect array of suggestion objects
              if (Array.isArray(res))
                return res.map((r: any) => {
                  const label =
                    typeof r.address === "string"
                      ? r.address
                      : r.address && typeof r.address === "object"
                      ? // try to build readable label from object fields
                        [r.address.street, r.address.locality, r.address.city, r.address.province]
                          .filter(Boolean)
                          .join(", ")
                      : String(r.address ?? r.label ?? r.value ?? r)

                  return {
                    label,
                    zip: r.zip ?? r.postal ?? r.postal_code ?? r.postalCode,
                    barangay: r.barangay ?? r.brgy ?? r.barangay_name ?? r.subdistrict,
                    city: r.city ?? r.municipality ?? r.town ?? r.city_name ?? r.locality,
                    province: r.province ?? r.province_name,
                    region: r.region ?? r.region_name ?? r.region_name_en,
                    raw: r,
                  } as Suggestion
                })
            } catch {
              // ignore
            }
            return []
          }
          // attempt to prefetch a broad set for structured selects
          ;(async () => {
            try {
              const res = await (searchRef.current?.("") ?? [])
              if (mounted) setSuggestions(Array.isArray(res) ? res.slice(0, 300) : [])
            } catch {
              // ignore
            }
          })()
        }
      })
      .catch(() => {
        // phil-address not available or failed — leave searchRef null
      })

    return () => {
      mounted = false
    }
  }, [])

  React.useEffect(() => {
    // keep internal query in sync with prop
    setQuery(value.address ?? "")
  }, [value.address])

  function scheduleSearch(q: string) {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(async () => {
      timerRef.current = null
      if (!searchRef.current) {
        setSuggestions([])
        return
      }
      setLoading(true)
      try {
        const res = await searchRef.current(q)
        setSuggestions(res.slice(0, 10))
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    onChange({ ...value, address: v })
    if (v.trim().length >= 3) scheduleSearch(v.trim())
    else setSuggestions([])
  }

  function handleSelect(s: Suggestion) {
    setQuery(s.label)
    setSuggestions([])
    // if structured fields are present, set the selects
    setSelectedRegion((s as any).region ?? undefined)
    setSelectedProvince((s as any).province ?? undefined)
    setSelectedCity((s as any).city ?? undefined)
    setSelectedBarangay((s as any).barangay ?? undefined)
    onChange({ ...value, address: s.label, zip: s.zip ?? value.zip })
  }

  function composeAddressFromSelection() {
    const parts = [selectedBarangay, selectedCity, selectedProvince, selectedRegion].filter(Boolean)
    const addr = parts.join(", ")
    // try to find a matching suggestion to obtain zip
    const match = suggestions.find((s) => {
      if (selectedRegion && s.region !== selectedRegion) return false
      if (selectedProvince && s.province !== selectedProvince) return false
      if (selectedCity && s.city !== selectedCity) return false
      if (selectedBarangay && s.barangay !== selectedBarangay) return false
      return true
    })
    onChange({ address: addr, zip: match?.zip ?? value.zip })
    setQuery(addr)
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder ?? "Type address (Philippines)"}
        aria-autocomplete="list"
      />

      {loading && (
        <div className="absolute right-2 top-2 text-xs text-muted-foreground">...searching</div>
      )}

      {/* Always show structured selects when requested so users don't have to type into one field */}
      {alwaysShowStructured && (
        <div className="mt-2 rounded-md border bg-popover p-3 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="block text-xs text-muted-foreground">Region</label>
              <select
                className="w-full rounded border px-2 py-1"
                value={selectedRegion ?? ""}
                onChange={(e) => {
                  setSelectedRegion(e.target.value || undefined)
                  setSelectedProvince(undefined)
                  setSelectedCity(undefined)
                  setSelectedBarangay(undefined)
                }}
              >
                <option value="">— Select region —</option>
                {Array.from(new Set(suggestions.map((s) => s.region).filter(Boolean))).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground">Province</label>
              <select
                className="w-full rounded border px-2 py-1"
                value={selectedProvince ?? ""}
                onChange={(e) => {
                  setSelectedProvince(e.target.value || undefined)
                  setSelectedCity(undefined)
                  setSelectedBarangay(undefined)
                }}
              >
                <option value="">— Select province —</option>
                {Array.from(new Set(suggestions.filter((s) => !selectedRegion || s.region === selectedRegion).map((s) => s.province).filter(Boolean))).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground">City / Municipality</label>
              <select
                className="w-full rounded border px-2 py-1"
                value={selectedCity ?? ""}
                onChange={(e) => {
                  setSelectedCity(e.target.value || undefined)
                  setSelectedBarangay(undefined)
                }}
              >
                <option value="">— Select city —</option>
                {Array.from(new Set(suggestions.filter((s) => (!selectedRegion || s.region === selectedRegion) && (!selectedProvince || s.province === selectedProvince)).map((s) => s.city).filter(Boolean))).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground">Barangay</label>
              <select
                className="w-full rounded border px-2 py-1"
                value={selectedBarangay ?? ""}
                onChange={(e) => setSelectedBarangay(e.target.value || undefined)}
              >
                <option value="">— Select barangay —</option>
                {Array.from(new Set(suggestions.filter((s) => (!selectedRegion || s.region === selectedRegion) && (!selectedProvince || s.province === selectedProvince) && (!selectedCity || s.city === selectedCity)).map((s) => s.barangay).filter(Boolean))).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="rounded bg-primary px-3 py-1 text-white"
              onClick={() => composeAddressFromSelection()}
            >
              Use selected
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => {
                // clear structured selects
                setSelectedRegion(undefined)
                setSelectedProvince(undefined)
                setSelectedCity(undefined)
                setSelectedBarangay(undefined)
              }}
            >
              Clear
            </button>
          </div>

          {Array.from(new Set(suggestions.map((s) => s.region).filter(Boolean))).length === 0 && (
            <div className="mt-2 text-xs text-muted-foreground">Type into the address field to populate region/province/city options, or leave blank.</div>
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="absolute z-40 mt-1 w-full">
          <ul className="max-h-48 overflow-auto rounded-md border bg-popover p-1 text-sm">
            {suggestions.map((s, i) => (
              <li
                key={i}
                role="option"
                className="cursor-pointer rounded px-2 py-1 hover:bg-accent"
                onClick={() => handleSelect(s)}
              >
                <div className="truncate">{typeof s.label === "string" ? s.label : JSON.stringify(s.label)}</div>
                {s.zip && <div className="text-muted-foreground text-xs">ZIP: {s.zip}</div>}
                {(s as any).city && <div className="text-xs text-muted-foreground">{(s as any).city} • {(s as any).province ?? ""}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
