export default function Input({ label, error, className = '', leadingIcon, id, ...props }) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined)
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-ink">{label}</label>}
      <div className="relative">
        {leadingIcon && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted/70">{leadingIcon}</span>}
        <input
          id={inputId}
          aria-invalid={error ? 'true' : props['aria-invalid']}
          aria-describedby={error ? `${inputId}-error` : props['aria-describedby']}
          className={`w-full rounded-xl border bg-panel py-2.5 text-sm text-ink placeholder:text-muted/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${leadingIcon ? 'pl-10 pr-3' : 'px-3'} ${
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-line focus:border-primary/60'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <span id={`${inputId}-error`} role="alert" className="text-xs font-medium text-danger">{error}</span>}
    </div>
  )
}
