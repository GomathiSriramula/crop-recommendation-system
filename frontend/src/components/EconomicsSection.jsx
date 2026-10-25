import { formatPercent, formatRupees } from '../lib/format'
import useLanguage from '../context/useLanguage'

function bestBy(recommendations, selector) {
    return recommendations.reduce((best, item) => (
        (Number(selector(item)) || 0) > (Number(selector(best)) || 0) ? item : best
    ), recommendations[0])
}

function Highlight({ title, crop, value }) {
    const { t } = useLanguage()
    return (
        <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{title}</p>
            <p className="mt-2 text-2xl font-bold text-emerald-950">{t(crop?.toLowerCase())}</p>
            <p className="text-sm text-slate-600">{value}</p>
        </div>
    )
}

function EconomicsSection({ recommendations }) {
    const { t } = useLanguage()
    const bestProfit = bestBy(recommendations, (item) => item.economics?.profit_rs_per_ha)
    const bestRoi = bestBy(recommendations, (item) => item.economics?.roi_percent)

    return (
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5">
                <h2 className="text-2xl font-bold text-emerald-950">{t('Economics by crop')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('Expected returns per hectare for the top five crops.')}</p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <Highlight title={t('Highest profit')} crop={bestProfit.crop} value={`${formatRupees(bestProfit.economics?.profit_rs_per_ha)} ${t('per ha')}`} />
                <Highlight title={t('Highest ROI')} crop={bestRoi.crop} value={formatPercent(bestRoi.economics?.roi_percent)} />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-semibold">{t('Crop')}</th>
                            <th className="px-4 py-3 text-right font-semibold">{t('Revenue')}</th>
                            <th className="px-4 py-3 text-right font-semibold">{t('Cost')}</th>
                            <th className="px-4 py-3 text-right font-semibold">{t('Profit')}</th>
                            <th className="px-4 py-3 text-right font-semibold">{t('ROI')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {recommendations.map((item, index) => (
                            <tr key={item.crop} className="text-slate-700">
                                <td className="px-4 py-4">
                                    <span className="inline-flex items-center gap-3">
                                        <span className="grid size-7 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{index + 1}</span>
                                        <span className="font-bold text-emerald-950">{t(item.crop?.toLowerCase())}</span>
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
                {t('The number in the circle is the model’s ranking. Estimates use assumed yields and prices, and crops differ in growing time (perennial fruit versus seasonal grains), so compare with care and use your local market prices.')}
            </p>
        </section>
    )
}

export default EconomicsSection