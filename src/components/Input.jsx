export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-ink">{label}</label>}
      <input
        className={`w-full rounded-xl border bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          error ? 'border-danger' : 'border-line focus:border-primary/60'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  )
}