import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import useToast from '../context/useToast'

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await register(form)
      navigate('/recommend')
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to create account.'
      setError(message)
      showToast(message)
    } finally {
      setSubmitting(false)
    }
  }
  return <div className="mx-auto max-w-lg"><PageHeader eyebrow="Join SoilWise" title="Create your account" description="Save every recommendation and build a better picture of your farm." /><form onSubmit={submit} className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm sm:p-7"><label className="grid gap-2 text-sm font-semibold">Name<input className="rounded-xl border border-slate-200 px-4 py-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label className="grid gap-2 text-sm font-semibold">Email<input className="rounded-xl border border-slate-200 px-4 py-3" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label className="grid gap-2 text-sm font-semibold">Password<input className="rounded-xl border border-slate-200 px-4 py-3" type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={submitting} className="flex justify-center rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <Spinner label="Creating account..." size="sm" /> : 'Create account'}</button><p className="text-center text-sm text-slate-500">Already registered? <Link className="font-semibold text-emerald-700" to="/login">Sign in</Link></p></form></div>
}

export default Register
