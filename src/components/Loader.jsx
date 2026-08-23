export default function Loader({ size = 'md' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizes[size]} rounded-full border-4 border-primary/20 border-t-primary animate-spin`}
      />
    </div>
  )
}