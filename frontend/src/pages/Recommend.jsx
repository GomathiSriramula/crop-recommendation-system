import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import useToast from '../context/useToast'

const fields = [
  { name: 'N', label: 'Nitrogen (N)', min: 0, max: 140, helperText: 'Typical range: 0–140 mg/kg.' },
  { name: 'P', label: 'Phosphorus (P)', min: 5, max: 145, helperText: 'Typical range: 5–145 mg/kg.' },
  { name: 'K', label: 'Potassium (K)', min: 5, max: 205, helperText: 'Typical range: 5–205 mg/kg.' },
  { name: 'temperature', label: 'Temperature', min: 8.8, max: 43.7, helperText: 'Typical range: 8.8–43.7 °C.' },
  { name: 'humidity', label: 'Humidity', min: 14.2, max: 100, helperText: 'Typical range: 14.2–100%.' },
  { name: 'ph', label: 'Soil pH', min: 3.5, max: 9.94, helperText: 'Typical range: pH 3.5–9.94.' },
  { name: 'rainfall', label: 'Rainfall', min: 20.2, max: 298.6, helperText: 'Typical range: 20.2–298.6 mm.' },
]

const initial = {
  N: 90,
  P: 42,
  K: 43,
  temperature: 25,
  humidity: 80,
  ph: 6.5,
  rainfall: 200,
}

function validateForm(form) {
  return Object.fromEntries(
    fields.flatMap(({ name, min, max }) => {
      const value = form[name]
      if (value === '' || !Number.isFinite(value)) return [[name, 'Enter a valid number.']]
      if (value < min || value > max) return [[name, `Use a value from ${min} to ${max}.`]]
      return []
    }),
  )
}

function Recommend() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useToast()

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
      showToast('Please correct the highlighted fields before continuing.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post('/recommend', form)
      sessionStorage.setItem('soilwise_result', JSON.stringify(data))
      navigate('/result')
    } catch (err) {
      const message = err.response?.data?.error || 'Could not generate a recommendation. Please sign in first.'
      setError(message)
      showToast(message)
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
        {fields.map((field) => (
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
            {submitting ? <Spinner label="Analyzing..." size="sm" /> : 'Analyze my field'}
          </button>
        </div>
        {error && <p role="alert" className="md:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </form>
    </div>
  )
}

export default Recommend
