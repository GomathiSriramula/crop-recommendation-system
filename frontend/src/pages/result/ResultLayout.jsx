import { useMemo } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { loadResult } from '../../lib/resultStorage'

const TABS = [
    { to: '/result', label: 'Overview', end: true },
    { to: '/result/why', label: 'Why this crop' },
    { to: '/result/soil', label: 'Soil' },
    { to: '/result/economics', label: 'Economics' },
    { to: '/result/what-if', label: 'What if' },
]

function ResultLayout() {
    // Read once; corrupt or missing data is treated as "no result".
    const result = useMemo(() => loadResult(), [])
    const recommendations = Array.isArray(result?.recommendations) ? result.recommendations : []

    if (!recommendations.length) {
        return (
            <div className="py-20 text-center">
                <h1 className="text-3xl font-bold text-emerald-950">No result yet</h1>
                <Link className="mt-5 inline-block text-emerald-700 underline" to="/recommend">
                    Start an assessment
                </Link>
            </div>
        )
    }

    const topCrop = recommendations[0].crop

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Your report</p>
                    <h1 className="text-3xl font-bold text-emerald-950 md:text-4xl">Best crops for your field</h1>
                </div>
                <Link to="/recommend" className="rounded-full border border-emerald-700 px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
                    New analysis
                </Link>
            </div>

            {result.saved === false && (
                <p role="alert" className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                    This recommendation could not be saved to your history. You can still use it here, but it will be gone once you leave.
                </p>
            )}

            <nav aria-label="Result sections" className="mb-6 overflow-x-auto">
                <div className="inline-flex gap-1 rounded-full bg-white p-1 shadow-sm">
                    {TABS.map((tab) => (
                        <NavLink
                            key={tab.to}
                            to={tab.to}
                            end={tab.end}
                            className={({ isActive }) =>
                                `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                }`
                            }
                        >
                            {tab.label}
                        </NavLink>
                    ))}
                </div>
            </nav>

            <Outlet context={{ result, recommendations, topCrop }} />
        </div>
    )
}

export default ResultLayout