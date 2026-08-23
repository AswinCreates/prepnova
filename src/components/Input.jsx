export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={`px-3 py-2 rounded-xl border transition-all duration-200 ${
          error ? 'border-danger shadow-danger/20' : 'border-gray-300 shadow-gray-200/20'
        } bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60 focus:shadow-lg shadow-primary/10 ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  )
}