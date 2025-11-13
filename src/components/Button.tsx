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
  const base = "inline-flex items-center justify-center rounded-full px-4 sm:px-5 h-10 sm:h-12 text-sm font-medium transition-colors"
  const styles = {
    primary: "bg-black text-white dark:bg-white dark:text-black hover:opacity-90",
    secondary:
      "border border-black/10 dark:border-white/20 bg-white/50 dark:bg-black/50 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10",
    ghost: "text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10",
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
