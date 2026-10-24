function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p>
      <h1 className="text-4xl font-bold tracking-tight text-emerald-950 md:text-5xl">{title}</h1>
      <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
    </div>
  )
}

export default PageHeader
