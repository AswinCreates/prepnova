import Loader from './Loader'

export default function Button({ children, variant = 'primary', loading = false, className = '', ...props }) {
  const base =
    'px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary'

  const variants = {
    primary: 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:brightness-105',
    secondary: 'bg-gradient-to-br from-secondary to-emerald-500 text-white shadow-lg shadow-secondary/20 hover:shadow-xl',
    outline:
      'border border-primary text-primary bg-white/60 hover:bg-primary hover:text-white hover:shadow-lg shadow-primary/10 transition-all',
    danger: 'bg-gradient-to-br from-danger to-rose-600 text-white shadow-lg shadow-danger/20 hover:brightness-105',
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader size="sm" />}
      {children}
    </button>
  )
}