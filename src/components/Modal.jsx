export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl animate-pop-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-xl leading-none text-muted transition-colors hover:bg-panel2 hover:text-ink"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}