import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import useToast from '../context/useToast'

function History() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    api.get(`/history?page=${page}&limit=10`)
      .then(({ data }) => {
        setItems(data.items)
        setPagination(data.pagination)
      })
      .catch((err) => {
        const message = err.response?.data?.error || 'Please sign in to view history.'
        setError(message)
        showToast(message)
      })
      .finally(() => setLoading(false))
  }, [page, showToast])

  const changePage = (nextPage) => {
    setLoading(true)
    setError('')
    setPage(nextPage)
  }

  const viewDetails = async (id) => {
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
      const topCrop = recommendations[0]?.crop
      const explanation = data.explanation?.length
        ? {
          crop: topCrop,
          probability: recommendations[0]?.probability,
          features: data.explanation.map((item) => ({
            feature: item.feature,
            value: item.value,
            contribution: item.shap,
            direction: item.direction,
            sentence: item.sentence,
          })),
        }
        : null
      sessionStorage.setItem('soilwise_result', JSON.stringify({ recommendations, explanation }))
      navigate('/result')
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to load prediction details.'
      setError(message)
      showToast(message)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this saved recommendation?')) return
    setDeletingId(id)
    try {
      await api.delete(`/history/${id}`)
      setItems((current) => current.filter((item) => item._id !== id))
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to delete this prediction.'
      setError(message)
      showToast(message)
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Your archive" title="Recommendation history" description="Revisit the field assessments you’ve saved." />
      {error && (
        <div className="mb-5 rounded-2xl bg-red-50 p-5 text-red-700">
          {error}
          {error.toLowerCase().includes('sign in') && <Link className="ml-2 font-semibold underline" to="/login">Sign in</Link>}
        </div>
      )}
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
                    <p className="text-sm font-semibold text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                    <h2 className="mt-2 text-2xl font-bold capitalize text-emerald-950">{topCrop?.crop || 'Recommendation'}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Top model recommendation · {topCrop ? `${(topCrop.probability * 100).toFixed(1)}% probability` : 'No probability recorded'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => viewDetails(item._id)} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">
                      View details
                    </button>
                    <button disabled={deletingId === item._id} onClick={() => remove(item._id)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                      {deletingId === item._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(item.top5Results || []).map((result, index) => (
                    <span key={result.crop} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-800">
                      #{index + 1} {result.crop}
                    </span>
                  ))}
                </div>
              </article>
            )
          })}
          {!items.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500">No saved recommendations yet.</p>}
          <div className="mt-3 flex items-center justify-between text-sm">
            <button disabled={page <= 1 || loading} onClick={() => changePage(page - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button>
            <span>Page {pagination.page || page} of {pagination.totalPages || 1}</span>
            <button disabled={!pagination.totalPages || page >= pagination.totalPages || loading} onClick={() => changePage(page + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default History
