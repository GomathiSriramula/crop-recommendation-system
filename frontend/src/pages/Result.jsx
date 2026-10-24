import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ExplanationSection from '../components/ExplanationSection'

function ProbabilityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-lg">
      <p className="font-semibold capitalize text-emerald-950">{payload[0].payload.crop}</p>
      <p className="text-sm text-emerald-700">{(payload[0].value * 100).toFixed(1)}% probability</p>
    </div>
  )
}

function soilStatusClasses(status) {
  if (status === 'Optimal') return 'bg-emerald-100 text-emerald-800'
  if (status === 'Low') return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

function Result() {
  const result = JSON.parse(sessionStorage.getItem('soilwise_result') || 'null')
  const recommendations = result?.recommendations || []
  const chartData = recommendations.map(({ crop, probability }) => ({ crop, probability }))
  const profitRanks = [...recommendations]
    .sort((a, b) => (b.economics?.profit_rs_per_ha || 0) - (a.economics?.profit_rs_per_ha || 0))
    .reduce((ranks, item, index) => ({ ...ranks, [item.crop]: index + 1 }), {})

  if (!result) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-bold text-emerald-950">No result yet</h1>
        <Link className="mt-5 inline-block text-emerald-700 underline" to="/recommend">
          Start an assessment
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Your report</p>
          <h1 className="text-4xl font-bold text-emerald-950">Best crops for your field</h1>
        </div>
        <Link to="/recommend" className="rounded-full border border-emerald-700 px-5 py-2 font-semibold text-emerald-700">
          New analysis
        </Link>
      </div>

      <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-emerald-950">Recommendation probability</h2>
          <p className="mt-1 text-sm text-slate-500">How strongly the model recommends each of the top five crops.</p>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce8df" vertical={false} />
              <XAxis dataKey="crop" tick={{ fill: '#475569', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(value) => `${value * 100}%`}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={<ProbabilityTooltip />} cursor={{ fill: '#ecfdf5' }} />
              <Bar dataKey="probability" fill="#047857" radius={[8, 8, 0, 0]} maxBarSize={72} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <ExplanationSection
        explanation={result.explanation}
        crop={result.explanation?.crop || recommendations[0]?.crop}
      />

      <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-emerald-950">Soil analysis</h2>
          <p className="mt-1 text-sm text-slate-500">See how your current soil readings compare with each recommended crop.</p>
          <p className="mt-3 text-xs text-slate-500">Soil analysis is rule-based from typical crop ranges. “Why this crop?” comes from the model.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {recommendations.map((item) => (
            <div key={item.crop} className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between bg-emerald-50 px-5 py-4">
                <h3 className="text-lg font-bold capitalize text-emerald-950">{item.crop}</h3>
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Soil fit</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Parameter</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Suggested fix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(item.soil_analysis || {}).map(([parameter, analysis]) => (
                      <tr key={parameter}>
                        <td className="px-5 py-4 font-semibold text-slate-700">{parameter}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${soilStatusClasses(analysis.status)}`}>
                            {analysis.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{analysis.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-emerald-950">Economics by crop</h2>
          <p className="mt-1 text-sm text-slate-500">Compare expected returns with the model ranking. All values are per hectare.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Crop</th>
                <th className="px-4 py-3 text-center font-semibold">ML rank</th>
                <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold">Cost</th>
                <th className="px-4 py-3 text-right font-semibold">Profit</th>
                <th className="px-4 py-3 text-center font-semibold">Profit rank</th>
                <th className="px-4 py-3 text-right font-semibold">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recommendations.map((item, index) => (
                <tr key={item.crop} className="text-slate-700">
                  <td className="px-4 py-4 font-bold capitalize text-emerald-950">{item.crop}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-grid size-7 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">{index + 1}</span>
                  </td>
                  <td className="px-4 py-4 text-right">₹{(item.economics?.revenue_rs_per_ha || 0).toLocaleString()}</td>
                  <td className="px-4 py-4 text-right">₹{(item.economics?.cost_rs_per_ha || 0).toLocaleString()}</td>
                  <td className="px-4 py-4 text-right font-bold text-emerald-700">₹{(item.economics?.profit_rs_per_ha || 0).toLocaleString()}</td>
                  <td className="px-4 py-4 text-center font-semibold">{profitRanks[item.crop]}</td>
                  <td className="px-4 py-4 text-right font-semibold">{item.economics?.roi_percent ?? 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5">
        {recommendations.map((item, index) => (
          <article key={item.crop} className="rounded-3xl bg-white p-6 shadow-sm md:flex md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">0{index + 1}</span>
                <h2 className="text-2xl font-bold capitalize text-emerald-950">{item.crop}</h2>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(item.soil_analysis || {}).map(([key, value]) => (
                  <span key={key} className={`rounded-full px-3 py-1 text-xs font-bold ${value.status === 'Optimal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {key}: {value.status}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 text-left md:mt-0 md:text-right">
              <p className="text-sm text-slate-500">Model probability</p>
              <p className="text-3xl font-bold text-emerald-700">{(item.probability * 100).toFixed(1)}%</p>
              <p className="mt-2 text-sm text-slate-600">ROI: {item.economics?.roi_percent}%</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default Result
