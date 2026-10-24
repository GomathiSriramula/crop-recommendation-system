import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../lib/api'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import useToast from '../context/useToast'

const labels = {
  N: 'Nitrogen',
  P: 'Phosphorus',
  K: 'Potassium',
  temperature: 'Temperature',
  humidity: 'Humidity',
  ph: 'Soil pH',
  rainfall: 'Rainfall',
}

function Insights() {
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    api.get('/feature-importance')
      .then(({ data }) => {
        setFeatures((data.features || []).map((item) => ({
          ...item,
          label: labels[item.feature] || item.feature,
          importance: Number(item.mean_absolute_shap || 0),
        })))
      })
      .catch((err) => {
        const message = err.response?.data?.error || 'Unable to load model insights.'
        setError(message)
        showToast(message)
      })
      .finally(() => setLoading(false))
  }, [showToast])

  return (
    <div>
      <PageHeader
        eyebrow="Model insights"
        title="What matters across the model"
        description="Mean absolute SHAP impact across the model’s background data. Larger values mean a feature generally influences predictions more."
      />
      {loading && <div className="flex justify-center rounded-2xl bg-white p-8 text-slate-500"><Spinner label="Loading model insights..." /></div>}
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-5 text-red-700">{error}</p>}
      {!loading && !error && (
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold text-emerald-950">Model-wide feature importance</h2>
          <p className="mt-1 text-sm text-slate-500">Average absolute contribution across all crop classes.</p>
          <div className="mt-6 h-[28rem] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={features}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#dce8df" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="label" type="category" width={100} tick={{ fill: '#475569', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [Number(value).toFixed(4), 'Mean absolute SHAP']} />
                <Bar dataKey="importance" fill="#047857" radius={[0, 8, 8, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}

export default Insights
