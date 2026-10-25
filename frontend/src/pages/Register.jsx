import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth'
import { getErrorMessage, getFieldErrors } from '../lib/errors'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import useLanguage from '../context/useLanguage'

// bcrypt (used by the backend) only looks at the first 72 bytes of a password.
const MAX_PASSWORD_BYTES = 72

function validate(form) {
  const errors = {}
  if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.'
  if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  else if (new TextEncoder().encode(form.password).length > MAX_PASSWORD_BYTES) {
    errors.password = `Password must be at most ${MAX_PASSWORD_BYTES} bytes.`
  }
  return errors
}

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { t } = useLanguage()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
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
    const clientErrors = validate(form)
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors)
      setError('Please correct the highlighted fields.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await register({ ...form, name: form.name.trim() })
      navigate('/recommend', { replace: true })
    } catch (err) {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Unable to create account.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow="Join SoilWise" title="Create your account" description="Save every recommendation and build a better picture of your farm." />
      <form onSubmit={submit} noValidate className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
        <Field label="Name" name="name" type="text" autoComplete="name" value={form.name} onChange={change} error={fieldErrors.name} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={change} error={fieldErrors.email} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={change}
          helperText="At least 8 characters."
          error={fieldErrors.password}
        />
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
        <button disabled={submitting} className="flex justify-center rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <Spinner label="Creating account..." size="sm" /> : t('Create account')}
        </button>
        <p className="text-center text-sm text-slate-500">
          {t('Already registered?')} <Link className="font-semibold text-emerald-700" to="/login">{t('Sign in')}</Link>
        </p>
      </form>
    </div>
  )
}

export default Register
