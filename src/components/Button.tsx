import Link from "next/link"
import { ReactNode } from "react"

// Enhanced button component with loading and layout support
type Props = {
  href?: string
  onClick?: () => void
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  className?: string
  target?: "_blank" | "_self" | "_parent" | "_top"
  rel?: string
  ariaLabel?: string
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}

export default function Button({ 
  href, 
  onClick, 
  children, 
  variant = "primary", 
  className, 
  target, 
  rel, 
  ariaLabel,
  loading,
  disabled,
  fullWidth
}: Props) {
  const base = "inline-flex items-center justify-center rounded-2xl px-8 h-12 sm:h-14 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
  const styles = {
    primary: "bg-brand-gradient text-white shadow-glow hover:scale-[1.05] hover:shadow-glow-lg hover:-translate-y-0.5",
    secondary: "border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:border-brand-via/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
    ghost: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900",
  }[variant]
  const cls = `${base} ${styles} ${fullWidth ? "w-full" : ""} ${className ?? ""}`
  
  const content = (
    <>
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </>
  )

  if (href && !disabled) {
    const isExternal = href.startsWith("http") || href.startsWith("mailto:")
    if (isExternal) {
      return (
        <a href={href} className={cls} target={target} rel={rel} aria-label={ariaLabel}>
          {content}
        </a>
      )
    }
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {content}
      </Link>
    )
  }
  return (
    <button className={cls} onClick={onClick} aria-label={ariaLabel} disabled={disabled || loading}>
      {content}
    </button>
  )
}
