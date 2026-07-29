"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A fixed, bespoke palette for this page only — a "title sequence" moment
 * that intentionally sits outside the app's accent-theme system:
 *   #0C0B09  void   — background
 *   #C79A4B  brass  — hairlines, timecode, the one accent
 *   #EDE6D8  bone   — primary text
 *   #8B8478  fog    — secondary text
 *   #6E8F71  moss   — price up
 *   #A85D45  rust   — price down
 *
 * Ticker prices are simulated client-side for atmosphere only — the real
 * dashboard runs on the live SSE feed.
 */
const TICKER_SEED = [
    { symbol: "AAPL", price: 231.14 },
    { symbol: "NVDA", price: 138.72 },
    { symbol: "MSFT", price: 452.09 },
    { symbol: "TSLA", price: 262.33 },
    { symbol: "AMZN", price: 198.56 },
    { symbol: "GOOGL", price: 179.42 },
    { symbol: "META", price: 512.88 },
    { symbol: "JPM", price: 214.67 },
    // { symbol: "BTC-USD", price: 96830.5 },
]

export default function Page() {
    const router = useRouter()
    const enterRef = useRef<HTMLAnchorElement>(null)
    const timecodeRef = useRef<HTMLSpanElement>(null)

    const [ready, setReady] = useState(false)
    const [reducedMotion, setReducedMotion] = useState(false)
    const [exiting, setExiting] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [origin, setOrigin] = useState({ x: 12, y: 88 })

    const [ticker, setTicker] = useState(TICKER_SEED.map((t) => ({ ...t, change: 0 })))

    // Entrance + motion preference, once on mount.
    useEffect(() => {
        const raf = requestAnimationFrame(() => setReady(true))
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        setReducedMotion(mq.matches)
        const onChange = () => setReducedMotion(mq.matches)
        mq.addEventListener("change", onChange)
        return () => {
            cancelAnimationFrame(raf)
            mq.removeEventListener("change", onChange)
        }
    }, [])

    // A running timecode, like a camera's burned-in counter. Mutates the DOM
    // directly so a 24fps readout doesn't re-render the rest of the page.
    useEffect(() => {
        const start = performance.now()
        let rafId: number
        function tick(now: number) {
            const elapsed = now - start
            const totalSeconds = Math.floor(elapsed / 1000)
            const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0")
            const ss = String(totalSeconds % 60).padStart(2, "0")
            const ff = String(Math.floor((elapsed % 1000) / (1000 / 24))).padStart(2, "0")
            if (timecodeRef.current) {
                timecodeRef.current.textContent = `${mm}:${ss}:${ff}`
            }
            rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [])

    // Ambient jitter so the chyron feels alive. Decorative only.
    useEffect(() => {
        const id = setInterval(() => {
            setTicker((prev) =>
                prev.map((t) => {
                    const next = +(t.price + (Math.random() - 0.5) * t.price * 0.003).toFixed(2)
                    return { ...t, price: next, change: +(((next - t.price) / t.price) * 100).toFixed(2) }
                })
            )
        }, 2400)
        return () => clearInterval(id)
    }, [])

    // Drives the exit wipe: expand a couple of frames after mount (so the
    // transition has something to animate from), then hand off to the router
    // once the screen reads as fully covered.
    useEffect(() => {
        if (!exiting) return
        let raf2 = 0
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setExpanded(true))
        })
        const navTimer = setTimeout(() => router.push("/dashboard"), 780)
        return () => {
            cancelAnimationFrame(raf1)
            cancelAnimationFrame(raf2)
            clearTimeout(navTimer)
        }
    }, [exiting, router])

    function handleEnter(e: React.MouseEvent<HTMLAnchorElement>) {
        if (reducedMotion) return // let the real link navigate immediately
        e.preventDefault()
        if (exiting) return
        const rect = enterRef.current?.getBoundingClientRect()
        if (rect) {
            setOrigin({
                x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
                y: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
            })
        }
        setExiting(true)
    }

    return (
        <div className="dark relative flex h-svh flex-col overflow-hidden bg-[#0C0B09] text-[#EDE6D8]">
            <div className="apex-grain pointer-events-none absolute inset-0" />
            <div className="apex-vignette pointer-events-none absolute inset-0" />
            <div className="apex-flicker pointer-events-none absolute inset-0" />

            {/* top letterbox bar */}
            <header
                className={cn(
                    "apex-rise relative z-10 flex h-10 shrink-0 items-center justify-between border-b border-[#C79A4B]/20 px-5 sm:h-12 sm:px-8",
                    ready && "apex-rise-in"
                )}
            >
                <span className="text-xs font-semibold tracking-[0.35em] text-[#EDE6D8]/80">APEX</span>
                <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-[#8B8478]">
                    <span className="apex-breathe h-1.5 w-1.5 rounded-full bg-[#A85D45]" />
                    <span>REC</span>
                    <span ref={timecodeRef} className="tabular-nums text-[#C79A4B]">
            00:00:00
          </span>
                </div>
            </header>

            {/* hero */}
            <main className="relative z-10 flex flex-1 flex-col justify-end px-5 pb-10 sm:px-8 lg:px-20 lg:pb-16">
                <div className="max-w-xl">
                    <p
                        className={cn(
                            "apex-rise mb-4 font-mono text-[11px] tracking-[0.35em] text-[#C79A4B]",
                            ready && "apex-rise-in"
                        )}
                        style={{ transitionDelay: "80ms" }}
                    >
                        LIVE MARKET FEED
                    </p>

                    <h1
                        className={cn(
                            "apex-rise text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl md:text-8xl",
                            ready && "apex-rise-in"
                        )}
                        style={{ transitionDelay: "160ms" }}
                    >
                        Apex Monitor
                    </h1>

                    <p
                        className={cn(
                            "apex-rise mt-6 max-w-sm text-balance text-sm leading-relaxed text-[#8B8478] sm:text-base",
                            ready && "apex-rise-in"
                        )}
                        style={{ transitionDelay: "260ms" }}
                    >
                        One screen. Every price, every position, updated as it happens.
                    </p>

                    <div className={cn("apex-rise mt-8", ready && "apex-rise-in")} style={{ transitionDelay: "360ms" }}>
                        <Link
                            ref={enterRef}
                            href="/dashboard"
                            onClick={handleEnter}
                            className="group inline-flex items-center rounded-sm text-sm font-semibold tracking-[0.2em] text-[#C79A4B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A4B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0B09]"
                        >
                            <span className="apex-underline">ENTER APEX</span>
                            <ArrowRight className="ml-2 inline-block h-4 w-4 align-[-2px] transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </main>

            {/* bottom letterbox bar / chyron */}
            <div
                className={cn(
                    "apex-rise relative z-10 h-9 shrink-0 overflow-hidden border-t border-[#C79A4B]/20 sm:h-10",
                    ready && "apex-rise-in"
                )}
                style={{ transitionDelay: "480ms" }}
            >
                <div className="apex-marquee flex h-full w-max items-center gap-8">
                    {[...ticker, ...ticker].map((t, i) => (
                        <span key={`${t.symbol}-${i}`} className="flex items-center gap-1.5 whitespace-nowrap px-2 font-mono text-xs">
              <span className="text-[#8B8478]">{t.symbol}</span>
              <span className="text-[#EDE6D8]">{t.price.toFixed(2)}</span>
              <span className={t.change >= 0 ? "text-[#6E8F71]" : "text-[#A85D45]"}>
                {t.change >= 0 ? "▲" : "▼"} {Math.abs(t.change).toFixed(2)}%
              </span>
            </span>
                    ))}
                </div>
            </div>

            {/* exit — a clean iris wipe, cut to black */}
            {exiting && (
                <div className="pointer-events-none fixed inset-0 z-[100]">
                    <div
                        className="absolute inset-0 bg-[#0C0B09] transition-[clip-path] duration-700 ease-[cubic-bezier(0.76,0,0.24,1)]"
                        style={{ clipPath: `circle(${expanded ? 150 : 0}% at ${origin.x}% ${origin.y}%)` }}
                    />
                </div>
            )}

            <style>{`
        .apex-grain {
          opacity: 0.05;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .apex-vignette {
          background: radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(0, 0, 0, 0.7) 100%);
        }
        .apex-flicker {
          background: rgba(237, 230, 216, 0.02);
          animation: apex-flicker-anim 6s ease-in-out infinite;
        }
        @keyframes apex-flicker-anim {
          0%, 100%, 48%, 52%, 75%, 77% { opacity: 1; }
          50% { opacity: 0.55; }
          76% { opacity: 0.85; }
        }
        .apex-breathe {
          animation: apex-breathe-anim 2.4s ease-in-out infinite;
        }
        @keyframes apex-breathe-anim {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        .apex-underline {
          background-image: linear-gradient(currentColor, currentColor);
          background-size: 0% 1px;
          background-repeat: no-repeat;
          background-position: left bottom;
          padding-bottom: 2px;
          transition: background-size 0.3s ease;
        }
        .group:hover .apex-underline {
          background-size: 100% 1px;
        }
        .apex-rise {
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .apex-rise-in {
          opacity: 1;
          transform: translateY(0);
        }
        .apex-marquee {
          animation: apex-marquee-scroll 34s linear infinite;
        }
        @keyframes apex-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .apex-marquee,
          .apex-flicker,
          .apex-breathe {
            animation: none !important;
          }
          .apex-rise {
            transition: opacity 0.2s ease !important;
            transform: none !important;
          }
        }
      `}</style>
        </div>
    )
}