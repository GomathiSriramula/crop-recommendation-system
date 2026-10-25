import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import useAuth from './context/useAuth'
import useLanguage from './context/useLanguage'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import Spinner from './components/Spinner'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'

// Chart-heavy pages are loaded on demand to keep the first load small.
const Recommend = lazy(() => import('./pages/Recommend'))
const History = lazy(() => import('./pages/History'))
const Insights = lazy(() => import('./pages/Insights'))
const Weather = lazy(() => import('./pages/Weather'))
const ResultLayout = lazy(() => import('./pages/result/ResultLayout'))
const Overview = lazy(() => import('./pages/result/Overview'))
const Why = lazy(() => import('./pages/result/Why'))
const Soil = lazy(() => import('./pages/result/Soil'))
const Economics = lazy(() => import('./pages/result/Economics'))
const WhatIf = lazy(() => import('./pages/result/WhatIf'))

const publicLinks = [['/', 'Home'], ['/weather', 'Weather']]
const privateLinks = [
  ['/recommend', 'Recommend'],
  ['/history', 'History'],
  ['/insights', 'Insights'],
]

const pageTitles = {
  '/': 'Data-led crop planning',
  '/login': 'Sign in',
  '/register': 'Create your account',
  '/recommend': 'Tell us about your soil',
  '/history': 'Recommendation history',
  '/weather': 'Weather forecast',
  '/insights': 'What matters across the model',
  '/result': 'Best crops for your field',
  '/result/why': 'Why this crop',
  '/result/soil': 'Soil analysis',
  '/result/economics': 'Economics',
  '/result/what-if': 'What if',
}

function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, logout } = useAuth()
  const { language, languageOptions, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const links = isAuthenticated ? [...publicLinks, ...privateLinks] : publicLinks
  const closeMenu = () => setMenuOpen(false)
  const outlineButton = 'rounded-full border border-emerald-700 px-5 py-2 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50'

  const handleLogout = () => {
    closeMenu()
    // Navigate first so ProtectedRoute does not record the page we are leaving as the
    // "return to" location for the next person who signs in.
    navigate('/login', { replace: true })
    logout()
  }

  return (
    <header className="relative border-b border-emerald-950/10 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-emerald-950">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-lg text-white">✦</span>
          SoilWise
        </Link>
        <button
          className="rounded-lg p-2 text-emerald-900 md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={t('Toggle menu')}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
        >
          ☰
        </button>
        {/* top-full pins the mobile menu directly under the header, whatever its height. */}
        <nav
          id="main-nav"
          className={`${menuOpen ? 'absolute left-0 right-0 top-full z-10 flex shadow-lg' : 'hidden'} flex-col gap-4 bg-white px-6 py-5 md:static md:flex md:flex-row md:items-center md:bg-transparent md:p-0 md:shadow-none`}
        >
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={closeMenu} className={({ isActive }) => `text-sm font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-600 hover:text-emerald-700'}`}>
              {t(label)}
            </NavLink>
          ))}
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <span className="sr-only">{t('Language')}</span>
            <select
              aria-label={t('Language')}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            >
              {languageOptions.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          {isAuthenticated ? (
            <>
              <button onClick={handleLogout} className={outlineButton}>{t('Log out')}</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu} className={outlineButton}>{t('Sign in')}</Link>
              <Link to="/register" onClick={closeMenu} className="rounded-full bg-emerald-700 px-5 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-800">{t('Create account')}</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

function App() {
  const { t } = useLanguage()
  const location = useLocation()

  useEffect(() => {
    document.title = `SoilWise · ${t(pageTitles[location.pathname] || 'Page not found')}`
  }, [location.pathname, t])

  return (
    <div className="min-h-screen bg-[#f5f8f1] text-slate-800">
      <Navigation />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <ErrorBoundary>
          <Suspense fallback={<div className="flex justify-center py-20 text-slate-500"><Spinner label={t('Loading...')} /> </div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/weather" element={<Weather />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/recommend" element={<Recommend />} />
                <Route path="/result" element={<ResultLayout />}>
                  <Route index element={<Overview />} />
                  <Route path="why" element={<Why />} />
                  <Route path="soil" element={<Soil />} />
                  <Route path="economics" element={<Economics />} />
                  <Route path="what-if" element={<WhatIf />} />
                </Route>
                <Route path="/history" element={<History />} />
                <Route path="/insights" element={<Insights />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-8 text-sm text-slate-500">{t('SoilWise · Smarter decisions for every field.')}</footer>
    </div>
  )
}

export default App