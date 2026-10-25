import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth'
import { getErrorMessage, getFieldErrors } from '../lib/errors'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(form)
      const from = location.state?.from
      navigate(from ? `${from.pathname}${from.search || ''}` : '/recommend', { replace: true })
    } catch (err) {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Unable to sign in.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow="Welcome back" title="Sign in" description="Access your recommendations and saved field history." />
      <form onSubmit={submit} className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
        <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} error={fieldErrors.email} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={change} error={fieldErrors.password} />
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={submitting} className="flex justify-center rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <Spinner label="Signing in..." size="sm" /> : 'Sign in'}
        </button>
        <p className="text-center text-sm text-slate-500">
          New here? <Link className="font-semibold text-emerald-700" to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  )
}

export default Login
