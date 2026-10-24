function Field({ label, name, type = 'number', value, onChange, min, max, step = 'any', helperText, error }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        className={`rounded-xl border bg-white px-4 py-3 outline-none transition focus:ring-4 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
        }`}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        aria-invalid={Boolean(error)}
        aria-describedby={`${name}-help`}
        required
      />
      <span id={`${name}-help`} className={`text-xs font-normal ${error ? 'text-red-600' : 'text-slate-500'}`}>
        {error || helperText}
      </span>
    </label>
  )
}

export default Field
