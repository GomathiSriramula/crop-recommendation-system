import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import useToast from '../context/useToast'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await login(form)
      navigate(location.state?.from?.pathname || '/recommend', { replace: true })
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to sign in.'
      setError(message)
      showToast(message)
    } finally {
      setSubmitting(false)
    }
  }
  return <div className="mx-auto max-w-lg"><PageHeader eyebrow="Welcome back" title="Sign in" description="Access your recommendations and saved field history." /><form onSubmit={submit} className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm sm:p-7"><label className="grid gap-2 text-sm font-semibold">Email<input className="rounded-xl border border-slate-200 px-4 py-3" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label className="grid gap-2 text-sm font-semibold">Password<input className="rounded-xl border border-slate-200 px-4 py-3" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={submitting} className="flex justify-center rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <Spinner label="Signing in..." size="sm" /> : 'Sign in'}</button><p className="text-center text-sm text-slate-500">New here? <Link className="font-semibold text-emerald-700" to="/register">Create an account</Link></p></form></div>
}

export default Login
