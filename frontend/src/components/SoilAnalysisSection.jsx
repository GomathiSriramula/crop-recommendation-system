import { useState } from 'react'
import { formatNumber } from '../lib/format'
import useLanguage from '../context/useLanguage'
import { soilStatusClasses } from '../lib/soilStatus'

const PARAMETER_LABELS = { N: 'Nitrogen (N)', P: 'Phosphorus (P)', K: 'Potassium (K)', ph: 'Soil pH' }

// Works for both the current API (signed) and older saved records:
// status gives the direction, the absolute value gives the amount.
function adjustmentText(analysis, t) {
    const amount = Math.abs(Number(analysis.change_needed))
    if (analysis.status === 'Optimal' || !Number.isFinite(amount) || amount === 0) return t('No change needed')
    return `${t(analysis.status === 'Low' ? 'Raise' : 'Lower')} by ${formatNumber(amount)}`
}

function SoilAnalysisSection({ recommendations }) {
    const { t } = useLanguage()
    const [selected, setSelected] = useState(recommendations[0]?.crop)
    const current = recommendations.find((item) => item.crop === selected) || recommendations[0]
    const entries = Object.entries(current?.soil_analysis || {})

    return (
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5">
                <h2 className="text-2xl font-bold text-emerald-950">{t('Soil analysis')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('Choose a crop to compare your soil with its typical range.')}</p>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
                {recommendations.map((item, index) => (
                    <button
                        key={item.crop}
                        type="button"
                        onClick={() => setSelected(item.crop)}
                        aria-pressed={item.crop === current.crop}
                        className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${item.crop === current.crop
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-emerald-50'
                            }`}
                    >
                        {index + 1}. {t(item.crop?.toLowerCase())}
                    </button>
                ))}
            </div>

            {entries.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">{t('No soil analysis is available for this crop.')}</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {entries.map(([parameter, analysis]) => (
                        <div key={parameter} className="rounded-2xl border border-slate-100 p-5">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="font-bold text-emerald-950">{t(PARAMETER_LABELS[parameter] || parameter)}</h3>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${soilStatusClasses(analysis.status)}`}>
                                    {t(analysis.status)}
                                </span>
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-slate-500">{t('Your value')}</dt>
                                    <dd className="mt-1 font-mono font-semibold text-slate-800">{analysis.value ?? '—'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-slate-500">{t('Typical range')}</dt>
                                    <dd className="mt-1 font-mono text-slate-600">
                                        {analysis.range_low != null ? `${analysis.range_low} – ${analysis.range_high}` : '—'}
                                    </dd>
                                </div>
                            </dl>
                            <p className="mt-4 text-sm font-semibold text-slate-700">{adjustmentText(analysis, t)}</p>
                            {analysis.suggestion && <p className="mt-1 text-sm leading-6 text-slate-500">{analysis.suggestion}</p>}
                        </div>
                    ))}
                </div>
            )}

            <p className="mt-6 text-xs leading-5 text-slate-400">
                {t('Ranges are the 10th–90th percentile of the training dataset per crop: statistical reference values, not validated agronomic limits. N, P and K are on the dataset’s own relative scale, not laboratory mg/kg. Consult a local agronomist before changing your soil.')}
            </p>
        </section>
    )
}

export default SoilAnalysisSection