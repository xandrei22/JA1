"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Suggestion = { label: string; zip?: string; [k: string]: any }
type CodeName = { code: string; name: string }

function normalizeCodeNameList(rows: unknown): CodeName[] {
  if (!Array.isArray(rows)) return []

  const mapped = rows
    .map((row) => {
      const entry = row as Record<string, unknown>
      const code = String(
        entry.code ??
          entry.id ??
          entry.psgcCode ??
          entry.regionCode ??
          entry.provinceCode ??
          entry.cityCode ??
          ""
      ).trim()
      const name = String(
        entry.name ??
          entry.regionName ??
          entry.provinceName ??
          entry.cityName ??
          entry.barangayName ??
          ""
      ).trim()

      if (!code || !name) return null
      return { code, name }
    })
    .filter((entry): entry is CodeName => Boolean(entry))

  // Remove duplicates while preserving order
  const seen = new Set<string>()
  const unique: CodeName[] = []
  for (const item of mapped) {
    const dedupeKey = `${item.code}|${item.name}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    unique.push(item)
  }

  return unique
}

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
  const [selectedRegionCode, setSelectedRegionCode] = React.useState<string>("")
  const [selectedProvinceCode, setSelectedProvinceCode] = React.useState<string>("")
  const [selectedCityCode, setSelectedCityCode] = React.useState<string>("")
  const [selectedBarangayCode, setSelectedBarangayCode] = React.useState<string>("")
  const [regionsList, setRegionsList] = React.useState<CodeName[]>([])
  const [provincesList, setProvincesList] = React.useState<CodeName[]>([])
  const [citiesList, setCitiesList] = React.useState<CodeName[]>([])
  const [barangaysList, setBarangaysList] = React.useState<CodeName[]>([])
  const [lookupError, setLookupError] = React.useState<string>("")

  const searchRef = React.useRef<((q: string) => Promise<Suggestion[]>) | null>(null)
  const regionsRef = React.useRef<(() => Promise<CodeName[]>) | null>(null)
  const provincesRef = React.useRef<((regionCode: string) => Promise<CodeName[]>) | null>(null)
  const citiesRef = React.useRef<((provinceCode: string) => Promise<CodeName[]>) | null>(null)
  const barangaysRef = React.useRef<((cityCode: string) => Promise<CodeName[]>) | null>(null)
  const timerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    // Dynamic import so server build is unaffected.
    let mounted = true
    import("phil-address")
      .then((mod) => {
        // try common exported names
        const moduleExports = mod as unknown as Record<string, unknown>
        const fn =
          (moduleExports.search ??
            moduleExports.autocomplete ??
            moduleExports.default ??
            moduleExports.suggest ??
            moduleExports.getSuggestions) as ((query: string) => Promise<unknown>) | undefined
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
        }

        const getRegions = moduleExports.regions as (() => Promise<CodeName[]>) | undefined
        const getProvinces = moduleExports.provinces as
          | ((regionCode: string) => Promise<CodeName[]>)
          | undefined
        const getCities = moduleExports.cities as
          | ((provinceCode: string) => Promise<CodeName[]>)
          | undefined
        const getBarangays = moduleExports.barangays as
          | ((cityCode: string) => Promise<CodeName[]>)
          | undefined

        if (typeof getRegions === "function") {
          regionsRef.current = getRegions
        }
        if (typeof getProvinces === "function") {
          provincesRef.current = getProvinces
        }
        if (typeof getCities === "function") {
          citiesRef.current = getCities
        }
        if (typeof getBarangays === "function") {
          barangaysRef.current = getBarangays
        }

        if (mounted && regionsRef.current) {
          void (async () => {
            try {
              const regions = await regionsRef.current!()
              if (!mounted) return
              setRegionsList(normalizeCodeNameList(regions))
              setLookupError("")
            } catch {
              if (!mounted) return
              setRegionsList([])
              setLookupError("Failed to load Philippine location options.")
            }
          })()
        }
      })
      .catch(() => {
        // phil-address not available or failed — leave searchRef null
        if (mounted) {
          setLookupError("Address lookup library failed to load.")
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  React.useEffect(() => {
    let mounted = true

    async function loadProvinces() {
      if (!selectedRegionCode || !provincesRef.current) {
        setProvincesList([])
        return
      }

      try {
        const rows = await provincesRef.current(selectedRegionCode)
        if (!mounted) return
        setProvincesList(normalizeCodeNameList(rows))
        setLookupError("")
      } catch {
        if (!mounted) return
        setProvincesList([])
      }
    }

    void loadProvinces()

    return () => {
      mounted = false
    }
  }, [selectedRegionCode])

  React.useEffect(() => {
    let mounted = true

    async function loadCities() {
      if (!selectedProvinceCode || !citiesRef.current) {
        setCitiesList([])
        return
      }

      try {
        const rows = await citiesRef.current(selectedProvinceCode)
        if (!mounted) return
        setCitiesList(normalizeCodeNameList(rows))
      } catch {
        if (!mounted) return
        setCitiesList([])
      }
    }

    void loadCities()

    return () => {
      mounted = false
    }
  }, [selectedProvinceCode])

  React.useEffect(() => {
    let mounted = true

    async function loadBarangays() {
      if (!selectedCityCode || !barangaysRef.current) {
        setBarangaysList([])
        return
      }

      try {
        const rows = await barangaysRef.current(selectedCityCode)
        if (!mounted) return
        setBarangaysList(normalizeCodeNameList(rows))
      } catch {
        if (!mounted) return
        setBarangaysList([])
      }
    }

    void loadBarangays()

    return () => {
      mounted = false
    }
  }, [selectedCityCode])

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
    onChange({ ...value, address: s.label, zip: s.zip ?? value.zip })
  }

  function composeAddressFromSelection() {
    const selectedRegion = regionsList.find((entry) => entry.code === selectedRegionCode)?.name
    const selectedProvince = provincesList.find((entry) => entry.code === selectedProvinceCode)?.name
    const selectedCity = citiesList.find((entry) => entry.code === selectedCityCode)?.name
    const selectedBarangay = barangaysList.find((entry) => entry.code === selectedBarangayCode)?.name
    const parts = [selectedBarangay, selectedCity, selectedProvince, selectedRegion].filter(Boolean)
    const addr = parts.join(", ")

    // Keep ZIP if user has set it manually; search match is optional.
    onChange({ address: addr, zip: value.zip })
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
                value={selectedRegionCode}
                onChange={(e) => {
                  const next = e.target.value
                  setSelectedRegionCode(next)
                  setSelectedProvinceCode("")
                  setSelectedCityCode("")
                  setSelectedBarangayCode("")
                }}
              >
                <option value="">— Select region —</option>
                {regionsList.map((r, index) => (
                  <option key={`${r.code}-${index}`} value={r.code}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground">Province</label>
              <select
                className="w-full rounded border px-2 py-1"
                value={selectedProvinceCode}
                disabled={!selectedRegionCode}
                onChange={(e) => {
                  const next = e.target.value
                  setSelectedProvinceCode(next)
                  setSelectedCityCode("")
                  setSelectedBarangayCode("")
                }}
              >
                <option value="">— Select province —</option>
                {provincesList.map((p, index) => (
                  <option key={`${p.code}-${index}`} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground">City / Municipality</label>
              <select
                className="w-full rounded border px-2 py-1"
                value={selectedCityCode}
                disabled={!selectedProvinceCode}
                onChange={(e) => {
                  const next = e.target.value
                  setSelectedCityCode(next)
                  setSelectedBarangayCode("")
                }}
              >
                <option value="">— Select city —</option>
                {citiesList.map((c, index) => (
                  <option key={`${c.code}-${index}`} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground">Barangay</label>
              <select
                className="w-full rounded border px-2 py-1"
                value={selectedBarangayCode}
                disabled={!selectedCityCode}
                onChange={(e) => setSelectedBarangayCode(e.target.value)}
              >
                <option value="">— Select barangay —</option>
                {barangaysList.map((b, index) => (
                  <option key={`${b.code}-${index}`} value={b.code}>{b.name}</option>
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
                setSelectedRegionCode("")
                setSelectedProvinceCode("")
                setSelectedCityCode("")
                setSelectedBarangayCode("")
              }}
            >
              Clear
            </button>
          </div>

          {lookupError ? (
            <div className="mt-2 text-xs text-destructive">{lookupError}</div>
          ) : null}
          {regionsList.length === 0 && !lookupError ? (
            <div className="mt-2 text-xs text-muted-foreground">Loading Philippine region/province/city options...</div>
          ) : null}
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
