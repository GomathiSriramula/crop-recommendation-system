import { useState } from 'react'
import api from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { CROPS, FEATURE_LABELS } from '../lib/featureRules'
import { formatNumber } from '../lib/format'
import Spinner from './Spinner'

function CounterfactualSection({ inputs, currentCrop }) {
    const options = CROPS.filter((crop) => crop !== currentCrop)
    const [target, setTarget] = useState(options[0])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState(null)

    const submit = async (event) => {
        event.preventDefault()
        setLoading(true)
        setError('')
        setResult(null)
        try {
            const { data } = await api.post('/counterfactual', { ...inputs, target_crop: target })
            setResult(data)
        } catch (err) {
            setError(getErrorMessage(err, 'Could not generate a what-if scenario.'))
        } finally {
            setLoading(false)
        }
    }

    const changedRows = (result?.changes || []).filter((row) => Math.abs(row.change) > 1e-6)

    return (
        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5">
                <h2 className="text-2xl font-bold text-emerald-950">What would it take?</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Pick another crop to see one example of how your readings would need to change for the model to recommend it.
                    This is a single illustrative scenario, not the only way, and climate values (temperature, humidity, rainfall) are rarely adjustable.
                </p>
            </div>

            <form onSubmit={submit} className="flex flex-wrap items-end gap-4">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Target crop
                    <select
                        value={target}
                        onChange={(event) => setTarget(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 capitalize outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    >
                        {options.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
                    </select>
                </label>
                <button
                    disabled={loading}
                    className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? <Spinner label="Searching..." size="sm" /> : 'Show example'}
                </button>
            </form>

            {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            {result && (
                <div className="mt-6 overflow-x-auto">
                    <p className="mb-3 text-sm text-slate-600">
                        To move from <strong className="capitalize">{result.current_crop}</strong> to{' '}
                        <strong className="capitalize">{result.target_crop}</strong>:
                    </p>
                    <table className="w-full min-w-[480px] text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Input</th>
                                <th className="px-4 py-3 text-right font-semibold">Now</th>
                                <th className="px-4 py-3 text-right font-semibold">Example</th>
                                <th className="px-4 py-3 text-right font-semibold">Change</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {result.changes.map((row) => {
                                const changed = changedRows.includes(row)
                                return (
                                    <tr key={row.feature} className={changed ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                                        <td className="px-4 py-3">{FEATURE_LABELS[row.feature] || row.feature}</td>
                                        <td className="px-4 py-3 text-right font-mono">{formatNumber(row.original)}</td>
                                        <td className="px-4 py-3 text-right font-mono">{formatNumber(row.counterfactual)}</td>
                                        <td className={`px-4 py-3 text-right font-mono ${changed ? (row.change > 0 ? 'text-emerald-700' : 'text-red-600') : ''}`}>
                                            {changed ? `${row.change > 0 ? '+' : ''}${formatNumber(row.change)}` : '—'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}

export default CounterfactualSection
