export default function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={`rounded-2xl bg-white/90 backdrop-blur border border-gray-100/80 shadow-sm shadow-gray-200/30 p-6 transition-all duration-300 ${
        hover ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}