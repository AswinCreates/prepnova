export default function Badge({ children, variant = 'primary', className = '' }) {
  const variants = {
    primary: 'bg-primary/10 text-primary dark:text-indigo-300 ring-1 ring-primary/20',
    secondary: 'bg-secondary/10 text-secondary dark:text-teal-300 ring-1 ring-secondary/20',
    success: 'bg-success/10 text-success dark:text-emerald-300 ring-1 ring-success/20',
    danger: 'bg-danger/10 text-danger dark:text-rose-300 ring-1 ring-danger/20',
    warning: 'bg-warning/10 text-warning dark:text-amber-300 ring-1 ring-warning/20',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}