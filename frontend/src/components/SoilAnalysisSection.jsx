import { formatNumber } from '../lib/format'

const PARAMETER_LABELS = { N: 'Nitrogen (N)', P: 'Phosphorus (P)', K: 'Potassium (K)', ph: 'Soil pH' }

export function soilStatusClasses(status) {
    if (status === 'Optimal') return 'bg-emerald-100 text-emerald-800'
    if (status === 'Low') return 'bg-amber-100 text-amber-800'
    return 'bg-red-100 text-red-800'
}

// Works for both the current API (signed: + raise, - lower) and older saved records,
// by using the status for the direction and the absolute value for the amount.
function adjustmentText(analysis) {
    const amount = Math.abs(Number(analysis.change_needed))
    if (analysis.status === 'Optimal' || !Number.isFinite(amount) || amount === 0) return '—'
    return `${analysis.status === 'Low' ? 'Raise' : 'Lower'} by ${formatNumber(amount)}`
}

function SoilAnalysisSection({ recommendations }) {
    return (
        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-emerald-950">Soil analysis</h2>
                <p className="mt-1 text-sm text-slate-500">See how your soil readings compare with the training-data range for each recommended crop.</p>
                <p className="mt-3 text-xs text-slate-400">
                    Ranges shown are the 10th–90th percentile of the training dataset per crop — statistical reference values, not validated agronomic limits.
                    N, P and K are on the dataset&apos;s own relative scale, not laboratory mg/kg. Consult a local agronomist before making soil amendments.
                </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                {recommendations.map((item) => (
                    <div key={item.crop} className="overflow-hidden rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between bg-emerald-50 px-5 py-4">
                            <h3 className="text-lg font-bold capitalize text-emerald-950">{item.crop}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Parameter</th>
                                        <th className="px-5 py-3 text-right font-semibold">Your value</th>
                                        <th className="px-5 py-3 font-semibold">Dataset range</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 font-semibold">Adjustment</th>
                                        <th className="px-5 py-3 font-semibold">Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(item.soil_analysis || {}).map(([parameter, analysis]) => (
                                        <tr key={parameter}>
                                            <td className="px-5 py-4 font-semibold text-slate-700">{PARAMETER_LABELS[parameter] || parameter}</td>
                                            <td className="px-5 py-4 text-right font-mono text-slate-700">{analysis.value ?? '—'}</td>
                                            <td className="whitespace-nowrap px-5 py-4 font-mono text-slate-500">
                                                {analysis.range_low != null ? `${analysis.range_low} – ${analysis.range_high}` : '—'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${soilStatusClasses(analysis.status)}`}>
                                                    {analysis.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 font-mono text-slate-700">{adjustmentText(analysis)}</td>
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
    )
}

export default SoilAnalysisSection
