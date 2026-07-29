"use client"

import * as React from "react"

const SseContext = React.createContext<EventSource | null>(null)

export function SseProvider({ children }: { children: React.ReactNode }) {
    const [source, setSource] = React.useState<EventSource | null>(null)

    React.useEffect(() => {
        const evtSource = new EventSource("http://localhost:8080/api/streams/subscribe-stream")
        setSource(evtSource)

        evtSource.onerror = (err) => {
            console.error("SSE connection error:", err)
        }

        return () => evtSource.close()
    }, [])

    return <SseContext.Provider value={source}>{children}</SseContext.Provider>
}

export function useSse() {
    return React.useContext(SseContext)
}