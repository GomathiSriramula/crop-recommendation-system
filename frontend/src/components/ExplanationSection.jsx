import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const featureLabels = {
  N: 'Nitrogen',
  P: 'Phosphorus',
  K: 'Potassium',
  temperature: 'Temperature',
  humidity: 'Humidity',
  ph: 'Soil pH',
  rainfall: 'Rainfall',
}

function ExplanationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const item = payload[0].payload
  return (
    <div className="max-w-xs rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm shadow-lg">
      <p className="font-semibold text-emerald-950">{item.label}</p>
      <p className={item.direction === 'supports' ? 'text-emerald-700' : 'text-red-600'}>
        {item.direction === 'supports' ? 'Supports' : 'Opposes'} · SHAP {item.shap.toFixed(4)}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        This shows how much this input pushed the model towards or away from the recommended crop.
      </p>
    </div>
  )
}

function ExplanationSection({ explanation, crop }) {
  const features = (explanation?.features || [])
    .map((item) => ({
      ...item,
      shap: Number(item.contribution ?? item.shap ?? 0),
      label: featureLabels[item.feature] || item.feature,
    }))
    .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap))

  if (!features.length) return null

  return (
    <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-emerald-950">Why this crop?</h2>
        <p className="mt-1 text-sm text-slate-500">
          How each input pushed the model towards {crop || explanation.crop || 'this crop'}.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-emerald-600" /> Supports</span>
          <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-red-500" /> Opposes</span>
          <span className="text-slate-400">Hover a bar for details.</span>
        </div>
      </div>
      <div className="h-[24rem] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={features}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#dce8df" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tick={{ fill: '#475569', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ExplanationTooltip />} cursor={{ fill: '#f0fdf4' }} />
            <Bar dataKey="shap" radius={[0, 6, 6, 0]} maxBarSize={28}>
              {features.map((item) => (
                <Cell key={item.feature} fill={item.direction === 'opposes' || item.shap < 0 ? '#ef4444' : '#059669'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-6 grid gap-3">
        {features.map((item) => (
          <p key={item.feature} className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {item.sentence}
          </p>
        ))}
      </div>
    </section>
  )
}

export default ExplanationSection
