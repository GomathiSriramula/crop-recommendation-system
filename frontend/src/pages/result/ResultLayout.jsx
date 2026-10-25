import { useMemo, useState } from 'react'
import { downloadCropReport } from '../../lib/pdfReport'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { loadResult } from '../../lib/resultStorage'
import useLanguage from '../../context/useLanguage'

const TABS = [
    { to: '/result', label: 'Overview', end: true },
    { to: '/result/why', label: 'Why this crop' },
    { to: '/result/soil', label: 'Soil' },
    { to: '/result/economics', label: 'Economics' },
    { to: '/result/what-if', label: 'What if' },
]

function ResultLayout() {
    const { t } = useLanguage()
    // Read once; corrupt or missing data is treated as "no result".
    const result = useMemo(() => loadResult(), [])
    const recommendations = Array.isArray(result?.recommendations) ? result.recommendations : []
    const [downloadState, setDownloadState] = useState('idle')

    const handleDownload = async () => {
        setDownloadState('loading')
        try {
            await downloadCropReport(result)
            setDownloadState('success')
        } catch {
            setDownloadState('error')
        }
    }

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

    const topCrop = recommendations[0].crop

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">{t('Your report')}</p>
                    <h1 className="text-3xl font-bold text-emerald-950 md:text-4xl">{t('Best crops for your field')}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={downloadState === 'loading'}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70"
                    >
                        <span aria-hidden="true">↓</span>
                        {downloadState === 'loading' ? t('Preparing PDF...') : t('Download PDF Report')}
                    </button>
                    <Link to="/recommend" className="rounded-full border border-emerald-700 px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
                        {t('New analysis')}
                    </Link>
                </div>
            </div>

            {downloadState === 'success' && (
                <p role="status" className="mb-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                    {t('PDF report downloaded successfully.')}
                </p>
            )}
            {downloadState === 'error' && (
                <p role="alert" className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {t('Unable to create the PDF report. Please try again.')}
                </p>
            )}

            {result.saved === false && (
                <p role="alert" className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                    {t('This recommendation could not be saved to your history. You can still use it here, but it will be gone once you leave.')}
                </p>
            )}

            <nav aria-label={t('Result sections')} className="mb-6 overflow-x-auto">
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
                            {t(tab.label)}
                        </NavLink>
                    ))}
                </div>
            </nav>

            <Outlet context={{ result, recommendations, topCrop }} />
        </div>
    )
}

export default ResultLayout