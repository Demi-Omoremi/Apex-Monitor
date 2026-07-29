"use client"

import { useState, useRef, useEffect } from "react"
import { Loader2, Search } from "lucide-react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

export interface Asset {
  symbol: string
  name: string
}

async function searchSymbols(query: string, signal: AbortSignal): Promise<Asset[]> {
  const response = await fetch(`http://localhost:8080/api/symbols/search?q=${encodeURIComponent(query)}`, { signal })
  if (!response.ok) throw new Error(`Search failed: ${response.status}`)
  return response.json()
}

export function SymbolCombobox({ onSelect }: { onSelect?: (asset: Asset) => void }) {
  const [results, setResults] = useState<Asset[]>([])
  const [selected, setSelected] = useState<Asset | null>(null)
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    },
    []
  )

  const items =
    !selected || results.some((a) => a.symbol === selected.symbol) ? results : [...results, selected]

  function handleInputValueChange(next: string, { reason }: { reason: string }) {
    setQuery(next)
    clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    const trimmed = next.trim()
    if (!trimmed) {
      setResults([])
      return
    }
    if (reason === "item-press") return

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller
      setIsLoading(true)
      searchSymbols(trimmed, controller.signal)
        .then((data) => {
          const lower = trimmed.toLowerCase()
          const sorted = [...data].sort((a, b) => {
            const aExact = a.symbol.toLowerCase() === lower
            const bExact = b.symbol.toLowerCase() === lower
            if (aExact !== bExact) return aExact ? -1 : 1
            const aStarts = a.symbol.toLowerCase().startsWith(lower)
            const bStarts = b.symbol.toLowerCase().startsWith(lower)
            if (aStarts !== bStarts) return aStarts ? -1 : 1
            return a.symbol.length - b.symbol.length
          })
          setResults(sorted)
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.error("Symbol search failed:", err)
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false)
        })
    }, 300)
  }

  return (
    <Combobox
      items={items}
      value={selected}
      itemToStringLabel={(a: Asset) => a?.symbol ?? ""}
      itemToStringValue={(a: Asset) => a?.symbol ?? ""}
      isItemEqualToValue={(a: Asset, b: Asset) => a.symbol === b.symbol}
      filter={null}
      inputValue={query}
      onValueChange={(next) => {
        setSelected(next)
        setQuery("")
        if (next) onSelect?.(next)
      }}
      onInputValueChange={handleInputValueChange}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8B8478]" />
        <ComboboxInput
            placeholder="Search ticker or company…"
            className="rounded-sm border-[#C79A4B]/20 bg-transparent pl-9 font-mono text-[#EDE6D8] placeholder:text-[#8B8478]/60 has-[[data-slot=input-group-control]:focus-visible]:border-[#C79A4B]/20 has-[[data-slot=input-group-control]:focus-visible]:ring-[#C79A4B]/50"
        />
        {isLoading && (
          <Loader2 className="absolute top-1/2 right-8 h-4 w-4 -translate-y-1/2 animate-spin text-[#C79A4B]" />
        )}
      </div>
      <ComboboxContent className="rounded-sm border-[#C79A4B]/20 bg-[#0C0B09] text-[#EDE6D8]">
        <ComboboxEmpty className="font-mono text-xs text-[#8B8478]">
          {isLoading
            ? "Searching…"
            : query.trim()
              ? `No matches for "${query.trim()}"`
              : "Start typing to search…"}
        </ComboboxEmpty>
        <ComboboxList>
          {(asset: Asset) => (
            <ComboboxItem
              key={asset.symbol}
              value={asset}
              className="focus:bg-[#C79A4B]/10 data-[highlighted]:bg-[#C79A4B]/10"
            >
              <span className="font-mono text-sm font-medium text-[#EDE6D8]">{asset.symbol}</span>
              <span className="ml-2 text-xs text-[#8B8478]">{asset.name}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
