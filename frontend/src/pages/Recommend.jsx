import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { getErrorMessage, getFieldErrors } from '../lib/errors'
import { DEFAULT_INPUT, FEATURE_FIELDS } from '../lib/featureRules'
import { saveResult } from '../lib/resultStorage'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import useToast from '../context/useToast'
import useLanguage from '../context/useLanguage'

function validateForm(form) {
  return Object.fromEntries(
    FEATURE_FIELDS.flatMap(({ name, min, max }) => {
      const value = form[name]
      if (value === '' || !Number.isFinite(value)) return [[name, 'Enter a valid number.']]
      if (value < min || value > max) return [[name, `Use a value from ${min} to ${max}.`]]
      return []
    }),
  )
}

function Recommend() {
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULT_INPUT)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useToast()
  const { t } = useLanguage()

  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value === '' ? '' : Number(value) }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      setError('Please correct the highlighted fields before continuing.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post('/recommend', form)
      saveResult(data)
      if (data.saved === false) {
        showToast('Your recommendation could not be saved to history.', 'error')
      }
      navigate('/result')
    } catch (err) {
      setErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Could not generate a recommendation. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Field assessment"
        title="Tell us about your soil"
        description="Enter the latest readings from your field. We’ll compare them with crop profiles and economics."
      />
      <form onSubmit={submit} noValidate className="grid gap-5 rounded-3xl bg-white p-7 shadow-sm md:grid-cols-2">
        {FEATURE_FIELDS.map((field) => (
          <Field
            key={field.name}
            {...field}
            value={form[field.name]}
            onChange={change}
            error={errors[field.name]}
          />
        ))}
        <div className="flex items-end">
          <button
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Spinner label="Analyzing..." size="sm" /> : t('Analyze my field')}
          </button>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{t(error)}</p>}
      </form>
    </div>
  )
}

export default Recommend
