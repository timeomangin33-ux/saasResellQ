import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
  prefix?: string
  suffix?: string
  locale?: string
}

const DURATION_MS = 900
// cubic ease-out
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  locale = "fr-FR",
  ...props
}: NumberTickerProps) {
  const from = direction === "down" ? value : startValue
  const to = direction === "down" ? startValue : value
  const [display, setDisplay] = useState(from)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const timer = setTimeout(() => {
      const start = performance.now()
      function tick(now: number) {
        if (cancelled) return
        const elapsed = now - start
        const t = Math.min(1, elapsed / DURATION_MS)
        setDisplay(from + (to - from) * ease(t))
        if (t < 1) {
          frameRef.current = requestAnimationFrame(tick)
        }
      }
      frameRef.current = requestAnimationFrame(tick)
    }, delay * 1000)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [from, to, delay])

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(display.toFixed(decimalPlaces)))

  return (
    <span
      className={cn(
        "inline-block tracking-wider tabular-nums text-white",
        className
      )}
      {...props}
    >
      {prefix}{formatted}{suffix}
    </span>
  )
}
