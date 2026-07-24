// hooks/use-accent-theme.tsx
"use client"

import * as React from "react"

const ACCENT_STORAGE_KEY = "accent-theme"

type AccentTheme = "default" | "red" | "orange" | "blue" | "violet" | "rose"

type AccentThemeContextValue = {
    accent: AccentTheme
    setAccent: (accent: AccentTheme) => void
}

const AccentThemeContext = React.createContext<AccentThemeContextValue | null>(null)

function applyAccent(accent: AccentTheme) {
    if (accent === "default") {
        document.documentElement.removeAttribute("data-accent")
    } else {
        document.documentElement.setAttribute("data-accent", accent)
    }
}

export function AccentThemeProvider({ children }: { children: React.ReactNode }) {
    const [accent, setAccentState] = React.useState<AccentTheme>("default")

    React.useEffect(() => {
        const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY) as AccentTheme | null
        if (stored) {
            setAccentState(stored)
            applyAccent(stored)
        }
    }, [])

    const setAccent = React.useCallback((next: AccentTheme) => {
        setAccentState(next)
        applyAccent(next)
        window.localStorage.setItem(ACCENT_STORAGE_KEY, next)
    }, [])

    return (
        <AccentThemeContext.Provider value={{ accent, setAccent }}>
            {children}
        </AccentThemeContext.Provider>
    )
}

export function useAccentTheme() {
    const ctx = React.useContext(AccentThemeContext)
    if (!ctx) {
        throw new Error("useAccentTheme must be used within an AccentThemeProvider")
    }
    return ctx
}