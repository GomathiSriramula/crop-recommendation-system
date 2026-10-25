import { Link, useOutletContext } from 'react-router-dom'
import { FEATURE_FIELDS } from '../../lib/featureRules'
import { formatPercent, formatProbability, formatRupees } from '../../lib/format'

function Stat({ label, value }) {
    return (
        <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-emerald-100">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
    )
}

function Overview() {
    const { result, recommendations, topCrop } = useOutletContext()
    const top = recommendations[0]
    const inputs = result.inputs

    return (
        <div className="grid gap-6">
            <section className="rounded-3xl bg-emerald-900 p-6 text-white shadow-sm md:p-8">
                <p className="text-sm font-semibold uppercase tracking-widest text-lime-200">Top recommendation</p>
                <h2 className="mt-2 text-4xl font-bold capitalize md:text-5xl">{topCrop}</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <Stat label="Model confidence" value={formatProbability(top.probability)} />
                    <Stat label="Profit / ha" value={formatRupees(top.economics?.profit_rs_per_ha)} />
                    <Stat label="ROI" value={formatPercent(top.economics?.roi_percent)} />
                </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
                <h2 className="text-xl font-bold text-emerald-950">Top 5 crops</h2>
                <p className="mt-1 text-sm text-slate-500">How strongly the model recommends each crop.</p>
                <ol className="mt-5 grid gap-4">
                    {recommendations.map((item, index) => {
                        const percent = Math.max(0, Math.min(100, Number(item.probability) * 100 || 0))
                        return (
                            <li key={item.crop} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3">
                                <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                                    {index + 1}
                                </span>
                                <div>
                                    <p className="font-semibold capitalize text-emerald-950">{item.crop}</p>
                                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-emerald-600"
                                            style={{ width: `${percent}%`, minWidth: percent > 0 ? '4px' : 0 }}
                                        />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-700">{formatProbability(item.probability)}</p>
                                    <p className="text-xs text-slate-500">ROI {formatPercent(item.economics?.roi_percent)}</p>
                                </div>
                            </li>
                        )
                    })}
                </ol>
            </section>

            {inputs && (
                <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
                    <h2 className="text-xl font-bold text-emerald-950">Your readings</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {FEATURE_FIELDS.map((field) => (
                            <span key={field.name} className="rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-700">
                                <span className="text-slate-500">{field.label}:</span>{' '}
                                <span className="font-semibold">{inputs[field.name]}</span>
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <div className="flex flex-wrap gap-3 text-sm">
                <Link to="/result/why" className="rounded-full bg-emerald-50 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-100">Why this crop →</Link>
                <Link to="/result/soil" className="rounded-full bg-emerald-50 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-100">Soil analysis →</Link>
                <Link to="/result/economics" className="rounded-full bg-emerald-50 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-100">Economics →</Link>
            </div>
        </div>
    )
}

export default Overview