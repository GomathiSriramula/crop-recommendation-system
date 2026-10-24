import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useAuth from './context/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Recommend from './pages/Recommend'
import Result from './pages/Result'
import History from './pages/History'
import Insights from './pages/Insights'

function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const links = [
    ['/', 'Home'],
    ['/recommend', 'Recommend'],
    ['/history', 'History'],
    ['/insights', 'Insights'],
  ]

  return (
    <header className="border-b border-emerald-950/10 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-emerald-950">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-lg text-white">✦</span>
          SoilWise
        </Link>
        <button className="rounded-lg p-2 text-emerald-900 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          ☰
        </button>
        <nav className={`${menuOpen ? 'absolute left-0 right-0 top-[73px] z-10 flex' : 'hidden'} flex-col gap-4 bg-white px-6 py-5 md:static md:flex md:flex-row md:items-center md:bg-transparent md:p-0`}>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `text-sm font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-600 hover:text-emerald-700'}`}>
              {label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <>
              <span className="hidden text-sm text-slate-500 lg:inline">{user?.name}</span>
              <button onClick={() => { logout(); navigate('/login') }} className="rounded-full border border-emerald-700 px-5 py-2 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">Log out</button>
            </>
          ) : (
            <Link to="/login" className="rounded-full border border-emerald-700 px-5 py-2 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-[#f5f8f1] text-slate-800">
      <Navigation />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/recommend" element={<Recommend />} />
            <Route path="/result" element={<Result />} />
            <Route path="/history" element={<History />} />
            <Route path="/insights" element={<Insights />} />
          </Route>
        </Routes>
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-8 text-sm text-slate-500">SoilWise · Smarter decisions for every field.</footer>
    </div>
  )
}

export default App
