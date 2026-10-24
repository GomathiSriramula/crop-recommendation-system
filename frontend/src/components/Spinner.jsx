function Spinner({ label = 'Loading...', size = 'md' }) {
  const sizes = {
    sm: 'size-4 border-2',
    md: 'size-6 border-2',
    lg: 'size-10 border-4',
  }

  return (
    <span className="inline-flex items-center gap-2" role="status" aria-label={label}>
      <span className={`inline-block animate-spin rounded-full border-emerald-200 border-t-emerald-700 ${sizes[size] || sizes.md}`} />
      <span>{label}</span>
    </span>
  )
}

export default Spinner
