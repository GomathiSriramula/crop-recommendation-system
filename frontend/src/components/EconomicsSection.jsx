import { formatPercent, formatRupees } from '../lib/format'

function bestBy(recommendations, selector) {
    return recommendations.reduce((best, item) => (
        (Number(selector(item)) || 0) > (Number(selector(best)) || 0) ? item : best
    ), recommendations[0])
}

function Highlight({ title, crop, value }) {
    return (
        <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{title}</p>
            <p className="mt-2 text-2xl font-bold capitalize text-emerald-950">{crop}</p>
            <p className="text-sm text-slate-600">{value}</p>
        </div>
    )
}

function EconomicsSection({ recommendations }) {
    const bestProfit = bestBy(recommendations, (item) => item.economics?.profit_rs_per_ha)
    const bestRoi = bestBy(recommendations, (item) => item.economics?.roi_percent)

    return (
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5">
                <h2 className="text-2xl font-bold text-emerald-950">Economics by crop</h2>
                <p className="mt-1 text-sm text-slate-500">Expected returns per hectare for the top five crops.</p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <Highlight title="Highest profit" crop={bestProfit.crop} value={`${formatRupees(bestProfit.economics?.profit_rs_per_ha)} per ha`} />
                <Highlight title="Highest ROI" crop={bestRoi.crop} value={formatPercent(bestRoi.economics?.roi_percent)} />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Crop</th>
                            <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                            <th className="px-4 py-3 text-right font-semibold">Cost</th>
                            <th className="px-4 py-3 text-right font-semibold">Profit</th>
                            <th className="px-4 py-3 text-right font-semibold">ROI</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {recommendations.map((item, index) => (
                            <tr key={item.crop} className="text-slate-700">
                                <td className="px-4 py-4">
                                    <span className="inline-flex items-center gap-3">
                                        <span className="grid size-7 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{index + 1}</span>
                                        <span className="font-bold capitalize text-emerald-950">{item.crop}</span>
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right">{formatRupees(item.economics?.revenue_rs_per_ha)}</td>
                                <td className="px-4 py-4 text-right">{formatRupees(item.economics?.cost_rs_per_ha)}</td>
                                <td className="px-4 py-4 text-right font-bold text-emerald-700">{formatRupees(item.economics?.profit_rs_per_ha)}</td>
                                <td className="px-4 py-4 text-right font-semibold">{formatPercent(item.economics?.roi_percent)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">
                The number in the circle is the model&apos;s ranking. Estimates use assumed yields and prices, and crops differ in growing time
                (perennial fruit versus seasonal grains), so compare with care and use your local market prices.
            </p>
        </section>
    )
}

export default EconomicsSection