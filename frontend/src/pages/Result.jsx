import { useMemo } from 'react'
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
import CounterfactualSection from '../components/CounterfactualSection'
import EconomicsSection from '../components/EconomicsSection'
import ExplanationSection from '../components/ExplanationSection'
import SoilAnalysisSection from '../components/SoilAnalysisSection'
import { soilStatusClasses } from '../lib/soilStatus'
import { formatPercent, formatProbability } from '../lib/format'
import { loadResult } from '../lib/resultStorage'
import useLanguage from '../context/useLanguage'

function ProbabilityTooltip({ active, payload }) {
  const { t } = useLanguage()
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-lg">
      <p className="font-semibold text-emerald-950">{t(payload[0].payload.crop?.toLowerCase())}</p>
      <p className="text-sm text-emerald-700">{formatProbability(payload[0].value)} {t('probability')}</p>
    </div>
  )
}

function Result() {
  const { t } = useLanguage()
  // Read once; corrupt or missing data is treated as "no result" instead of crashing.
  const result = useMemo(() => loadResult(), [])
  const recommendations = Array.isArray(result?.recommendations) ? result.recommendations : []

  if (!recommendations.length) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-bold text-emerald-950">{t('No result yet')}</h1>
        <Link className="mt-5 inline-block text-emerald-700 underline" to="/recommend">
          {t('Start an assessment')}
        </Link>
      </div>
    )
  }

  const chartData = recommendations.map(({ crop, probability }) => ({ crop, probability }))
  const topCrop = recommendations[0].crop
  const othersAreNegligible = recommendations.slice(1).every((item) => Number(item.probability) < 0.01)

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">{t('Your report')}</p>
          <h1 className="text-4xl font-bold text-emerald-950">{t('Best crops for your field')}</h1>
        </div>
        <Link to="/recommend" className="rounded-full border border-emerald-700 px-5 py-2 font-semibold text-emerald-700">
          {t('New analysis')}
        </Link>
      </div>

      {result.saved === false && (
        <p role="alert" className="mb-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          {t('This recommendation could not be saved to your history. You can still use it here, but it will be gone once you leave this page.')}
        </p>
      )}

      <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-emerald-950">{t('Recommendation probability')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('How strongly the model recommends each of the top five crops.')}</p>
          {othersAreNegligible && (
            <p className="mt-2 text-xs text-slate-400">
              {t('The model is very confident in {crop}; the other crops shown are far less likely to suit these conditions.', { crop: t(topCrop?.toLowerCase()) })}
            </p>
          )}
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce8df" vertical={false} />
              <XAxis dataKey="crop" tickFormatter={(crop) => t(crop?.toLowerCase())} tick={{ fill: '#475569', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(value) => `${Math.round(value * 100)}%`}
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
        crop={result.explanation?.crop || topCrop}
      />

      <SoilAnalysisSection recommendations={recommendations} />
      <EconomicsSection recommendations={recommendations} />

      {result.inputs && (
        <CounterfactualSection key={topCrop} inputs={result.inputs} currentCrop={topCrop} />
      )}

      <div className="grid gap-5">
        {recommendations.map((item, index) => (
          <article key={item.crop} className="rounded-3xl bg-white p-6 shadow-sm md:flex md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">0{index + 1}</span>
                <h2 className="text-2xl font-bold text-emerald-950">{t(item.crop?.toLowerCase())}</h2>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(item.soil_analysis || {}).map(([key, value]) => (
                  <span key={key} className={`rounded-full px-3 py-1 text-xs font-bold ${soilStatusClasses(value.status)}`}>
                    {t(key)}: {t(value.status)}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 text-left md:mt-0 md:text-right">
              <p className="text-sm text-slate-500">{t('Model probability')}</p>
              <p className="text-3xl font-bold text-emerald-700">{formatProbability(item.probability)}</p>
              <p className="mt-2 text-sm text-slate-600">{t('ROI')}: {formatPercent(item.economics?.roi_percent)}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default Result
