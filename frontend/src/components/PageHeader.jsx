import useLanguage from '../context/useLanguage'

function PageHeader({ eyebrow, title, description }) {
  const { t } = useLanguage()

  return (
    <div className="mb-8 max-w-2xl">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">{t(eyebrow)}</p>
      <h1 className="text-4xl font-bold tracking-tight text-emerald-950 md:text-5xl">{t(title)}</h1>
      <p className="mt-4 text-lg leading-8 text-slate-600">{t(description)}</p>
    </div>
  )
}

export default PageHeader
