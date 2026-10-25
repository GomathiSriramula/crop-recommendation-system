import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { FEATURE_NAMES } from '../lib/featureRules'
import { formatProbability } from '../lib/format'
import { saveResult } from '../lib/resultStorage'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import useToast from '../context/useToast'
import useLanguage from '../context/useLanguage'

const PAGE_SIZE = 10

function History() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [pagination, setPagination] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState('')
  const [openingId, setOpeningId] = useState('')
  const { showToast } = useToast()
  const { t, language } = useLanguage()

  useEffect(() => {
    // The controller cancels this request if the page changes again or the component
    // unmounts, so a slow old response can never overwrite a newer one.
    const controller = new AbortController()
    api.get('/history', { params: { page, limit: PAGE_SIZE }, signal: controller.signal })
      .then(({ data }) => {
        setItems(data.items)
        setPagination(data.pagination)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        const message = getErrorMessage(err, 'Unable to load your history.')
        setError(message)
        showToast(message)
        setLoading(false)
      })

    return () => controller.abort()
  }, [page, reloadKey, showToast])

  const viewDetails = useCallback(async (id) => {
    setOpeningId(id)
    try {
      const { data } = await api.get(`/history/${id}`)
      const soilByCrop = Object.fromEntries((data.soilAnalysis || []).map((item) => [item.crop, item.analysis]))
      const economicsByCrop = Object.fromEntries((data.economics || []).map((item) => [item.crop, item]))
      const recommendations = (data.top5Results || []).map((item) => ({
        crop: item.crop,
        probability: item.probability,
        soil_analysis: soilByCrop[item.crop] || {},
        economics: economicsByCrop[item.crop] || {},
      }))
      const topCrop = data.explanationMeta?.crop || recommendations[0]?.crop
      const explanation = data.explanation?.length
        ? {
          crop: topCrop,
          probability: data.explanationMeta?.probability ?? recommendations[0]?.probability,
          base_value: data.explanationMeta?.base_value ?? 0,
          features: data.explanation.map((item) => ({
            feature: item.feature,
            value: item.value,
            contribution: item.shap,
            direction: item.direction,
            sentence: item.sentence,
          })),
        }
        : null
      const inputs = Object.fromEntries(FEATURE_NAMES.map((name) => [name, data[name]]))
      saveResult({ recommendations, explanation, inputs, id: data._id, saved: true })
      navigate('/result')
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to load prediction details.')
      setError(message)
      showToast(message)
    } finally {
      setOpeningId('')
    }
  }, [navigate, showToast])

  const remove = async (id) => {
    if (!window.confirm(t('Delete this saved recommendation?'))) return
    setDeletingId(id)
    try {
      await api.delete(`/history/${id}`)
      if (items.length === 1 && page > 1) {
        // Deleted the last item on this page: step back one page (that triggers a reload).
        setLoading(true)
        setError('')
        setPage(page - 1)
      } else {
        // Reload so the list, total and page count stay accurate.
        setLoading(true)
        setError('')
        setReloadKey((current) => current + 1)
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to delete this prediction.')
      setError(message)
      showToast(message)
    } finally {
      setDeletingId('')
    }
  }

  const totalPages = pagination.totalPages || 1

  return (
    <div>
      <PageHeader eyebrow="Your archive" title="Recommendation history" description="Revisit the field assessments you’ve saved." />
      {error && <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-5 text-red-700">{t(error)}</p>}
      {loading ? (
        <div className="flex justify-center rounded-2xl bg-white p-8 text-slate-500"><Spinner label="Loading your history..." /></div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const topCrop = item.top5Results?.[0]
            return (
              <article key={item._id} className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{new Date(item.createdAt).toLocaleString(language)}</p>
                    <h2 className="mt-2 text-2xl font-bold text-emerald-950">{topCrop?.crop ? t(topCrop.crop.toLowerCase()) : t('Recommendation')}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {t('Top model recommendation')} · {topCrop ? `${formatProbability(topCrop.probability)} ${t('probability')}` : t('No probability recorded')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={openingId === item._id}
                      onClick={() => viewDetails(item._id)}
                      className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {openingId === item._id ? t('Opening...') : t('View details')}
                    </button>
                    <button
                      disabled={deletingId === item._id}
                      onClick={() => remove(item._id)}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === item._id ? t('Deleting...') : t('Delete')}
                    </button>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(item.top5Results || []).map((result, index) => (
                    <span key={result.crop} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-800">
                      #{index + 1} {t(result.crop?.toLowerCase())}
                    </span>
                  ))}
                </div>
              </article>
            )
          })}
          {!items.length && !error && <p className="rounded-2xl bg-white p-8 text-center text-slate-500">{t('No saved recommendations yet.')}</p>}
          <div className="mt-3 flex items-center justify-between text-sm">
            <button disabled={page <= 1 || loading} onClick={() => { setLoading(true); setError(''); setPage(page - 1) }} className="rounded-lg border px-4 py-2 disabled:opacity-40">{t('Previous')}</button>
            <span>{t('Page')} {pagination.page || page} {t('of')} {totalPages}</span>
            <button disabled={page >= totalPages || loading} onClick={() => { setLoading(true); setError(''); setPage(page + 1) }} className="rounded-lg border px-4 py-2 disabled:opacity-40">{t('Next')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default History
