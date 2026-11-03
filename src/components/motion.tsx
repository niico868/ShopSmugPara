import { createElement, useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../lib/format'

/** True once the element has scrolled into view. It stays true. */
export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, seen }
}

type FallProps = HTMLAttributes<HTMLElement> & { text: string; as?: 'h1' | 'h2' | 'h3' | 'p'; stagger?: number }

/** A headline whose letters fall into place as it scrolls into view. New lines come from "\n" in the text. */
export function FallText({ text, as = 'h2', stagger = 22, className, ...rest }: FallProps) {
  const { ref, seen } = useInView<HTMLElement>(0.25)
  let n = 0
  const lines = text.split('\n').map((line, l) => (
    <span key={l} className="block" aria-hidden>
      {line.split(' ').map((word, w) => (
        <span key={w} className="inline-block whitespace-nowrap">
          {[...word].map((ch, c) => {
            const style: CSSProperties = { transitionDelay: `${n++ * stagger}ms` }
            return <span key={c} className="fall-char" style={style}>{ch}</span>
          })}
          <span className="inline-block">&nbsp;</span>
        </span>
      ))}
    </span>
  ))
  return createElement(as, { ...rest, ref, 'aria-label': text.replace(/\n/g, ' '), className: cx(className, seen && 'fall-in') }, lines)
}

/** A block that rises into place as it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, seen } = useInView<HTMLDivElement>(0.12)
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={cx('reveal', seen && 'reveal-in', className)}>{children}</div>
}
