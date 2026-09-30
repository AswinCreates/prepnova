import Loader from './Loader'

export default function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app'

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
  }

  const variants = {
    primary:
      'bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:brightness-110',
    secondary:
      'bg-secondary text-white shadow-md shadow-secondary/20 hover:shadow-lg hover:brightness-110',
    outline: 'border border-line bg-panel2 text-ink hover:border-primary/50 hover:text-primary',
    ghost: 'text-muted hover:bg-panel2 hover:text-ink',
    danger:
      'bg-danger text-white shadow-md shadow-danger/20 hover:shadow-lg hover:brightness-110',
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader size="sm" />}
      {children}
    </button>
  )
}
