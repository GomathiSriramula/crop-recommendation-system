import { Link } from 'react-router-dom'
import useAuth from '../context/useAuth'
import useLanguage from '../context/useLanguage'

function Home() {
  const { isAuthenticated, user } = useAuth()
  const { t } = useLanguage()
  const userName = user?.name?.trim()

  return (
    <div>
      {isAuthenticated && userName && (
        <div className="-mt-3 mb-1 md:-mt-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-sm font-semibold text-emerald-800">
            <span aria-hidden="true" className="relative block size-6 rounded-full bg-emerald-700">
              <span className="absolute left-1/2 top-[5px] size-[6px] -translate-x-1/2 rounded-full bg-white" />
              <span className="absolute bottom-[4px] left-1/2 size-[12px] -translate-x-1/2 rounded-t-full bg-white" />
            </span>
            <span>{t('Welcome back, {name}!', { name: userName })}</span>
          </p>
        </div>
      )}
      <section className="grid items-center gap-12 py-4 md:grid-cols-[1.1fr_.9fr] md:py-8">
      <div>
        <p className="mb-5 inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">{t('Data-led crop planning')}</p>
        <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-emerald-950 md:text-7xl">{t('Grow with confidence.')}</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{t('Turn your soil data into practical crop recommendations, soil guidance, and per-hectare economics.')}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/recommend" className="rounded-full bg-emerald-700 px-6 py-3 font-bold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800">{t('Get a recommendation')}</Link>
          {!isAuthenticated && (
            <Link to="/register" className="rounded-full border border-emerald-700 px-6 py-3 font-bold text-emerald-700 transition hover:bg-emerald-50">{t('Create account')}</Link>
          )}
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[2rem] bg-emerald-900 p-8 text-white shadow-2xl shadow-emerald-950/15">
        <div className="absolute -right-12 -top-12 size-48 rounded-full bg-lime-300/20" />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-widest text-lime-200">{t('Your field, understood')}</p>
          <div className="mt-16 grid gap-4 sm:grid-cols-2">
            {['22 crop profiles', 'Soil health insights', 'Profit estimates', 'Saved history'].map((item, index) => (
              <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-5">
                <span className="text-3xl text-lime-300">0{index + 1}</span>
                <p className="mt-3 font-semibold">{t(item)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </section>
    </div>
  )
}

export default Home
