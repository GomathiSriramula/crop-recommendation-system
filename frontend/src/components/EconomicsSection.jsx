import { formatPercent, formatRupees } from '../lib/format'

function rankBy(recommendations, selector) {
    return [...recommendations]
        .sort((a, b) => (Number(selector(b)) || 0) - (Number(selector(a)) || 0))
        .reduce((ranks, item, index) => ({ ...ranks, [item.crop]: index + 1 }), {})
}

function EconomicsSection({ recommendations }) {
    const profitRanks = rankBy(recommendations, (item) => item.economics?.profit_rs_per_ha)
    const roiRanks = rankBy(recommendations, (item) => item.economics?.roi_percent)

    return (
        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-emerald-950">Economics by crop</h2>
                <p className="mt-1 text-sm text-slate-500">Compare expected returns with the model ranking. All values are per hectare.</p>
                <p className="mt-3 text-xs text-slate-400">
                    Illustrative estimates based on assumed yields and prices. Crops differ in growing time (perennial fruit crops versus seasonal grains),
                    so compare profit with care and use your local market prices.
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Crop</th>
                            <th className="px-4 py-3 text-center font-semibold">ML rank</th>
                            <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                            <th className="px-4 py-3 text-right font-semibold">Cost</th>
                            <th className="px-4 py-3 text-right font-semibold">Profit</th>
                            <th className="px-4 py-3 text-center font-semibold">Profit rank</th>
                            <th className="px-4 py-3 text-right font-semibold">ROI</th>
                            <th className="px-4 py-3 text-center font-semibold">ROI rank</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {recommendations.map((item, index) => (
                            <tr key={item.crop} className="text-slate-700">
                                <td className="px-4 py-4 font-bold capitalize text-emerald-950">{item.crop}</td>
                                <td className="px-4 py-4 text-center">
                                    <span className="inline-grid size-7 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">{index + 1}</span>
                                </td>
                                <td className="px-4 py-4 text-right">{formatRupees(item.economics?.revenue_rs_per_ha)}</td>
                                <td className="px-4 py-4 text-right">{formatRupees(item.economics?.cost_rs_per_ha)}</td>
                                <td className="px-4 py-4 text-right font-bold text-emerald-700">{formatRupees(item.economics?.profit_rs_per_ha)}</td>
                                <td className="px-4 py-4 text-center font-semibold">{profitRanks[item.crop]}</td>
                                <td className="px-4 py-4 text-right font-semibold">{formatPercent(item.economics?.roi_percent)}</td>
                                <td className="px-4 py-4 text-center font-semibold">{roiRanks[item.crop]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

export default EconomicsSection
