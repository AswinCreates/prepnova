import Loader from './Loader'

export default function Button({ children, variant = 'primary', loading = false, className = '', ...props }) {
  const base = 'px-4 py-2 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-secondary text-white hover:opacity-90',
    outline: 'border border-primary text-primary hover:bg-primary hover:text-white',
    danger: 'bg-danger text-white hover:opacity-90',
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader size="sm" />}
      {children}
    </button>
  )
}