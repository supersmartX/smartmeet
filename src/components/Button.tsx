import Link from "next/link"
import { ReactNode } from "react"

type Props = {
  href?: string
  onClick?: () => void
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  className?: string
  target?: "_blank" | "_self" | "_parent" | "_top"
  rel?: string
  ariaLabel?: string
}

export default function Button({ href, onClick, children, variant = "primary", className, target, rel, ariaLabel }: Props) {
  const base = "inline-flex items-center justify-center rounded-2xl px-8 h-12 sm:h-14 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.98]"
  const styles = {
    primary: "bg-brand-gradient text-white shadow-glow hover:scale-[1.05] hover:shadow-glow-lg hover:-translate-y-0.5",
    secondary: "border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:border-brand-via/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
    ghost: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900",
  }[variant]
  const cls = `${base} ${styles} ${className ?? ""}`
  if (href) {
    const isExternal = href.startsWith("http") || href.startsWith("mailto:")
    if (isExternal) {
      return (
        <a href={href} className={cls} target={target} rel={rel} aria-label={ariaLabel}>
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    )
  }
  return (
    <button className={cls} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  )
}
