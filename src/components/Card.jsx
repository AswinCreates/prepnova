export default function Card({
  children,
  className = '',
  hover = false,
  padded = true,
  onClick,
  onKeyDown,
  onKeyUp,
  role,
  tabIndex,
  ...props
}) {
  const handleKeyDown = (event) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || !onClick) return
    if (event.key === 'Enter') {
      event.preventDefault()
      onClick(event)
    } else if (event.key === ' ') {
      event.preventDefault()
    }
  }

  const handleKeyUp = (event) => {
    onKeyUp?.(event)
    if (!event.defaultPrevented && onClick && event.key === ' ') {
      event.preventDefault()
      onClick(event)
    }
  }

  return (
    <div
      {...props}
      role={onClick ? 'button' : role}
      tabIndex={onClick ? (tabIndex ?? 0) : tabIndex}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : onKeyDown}
      onKeyUp={onClick ? handleKeyUp : onKeyUp}
      className={`rounded-2xl border border-line bg-panel shadow-sm transition-all duration-300 ${
        padded ? 'p-6' : ''
      } ${
        hover
          ? 'hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10'
          : ''
      } ${onClick ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
