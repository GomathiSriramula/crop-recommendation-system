import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import useLanguage from '../context/useLanguage'
import { fetchWeather, searchLocations, weatherCondition, weatherIcon } from '../lib/weather'

const DEFAULT_LOCATION = { name: 'Delhi', admin1: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 }

function formatDay(dateValue, index) {
  if (index === 0) return 'Today'
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${dateValue}T12:00:00`))
}

function Weather() {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [options, setOptions] = useState([])
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetchWeather(location, controller.signal)
      .then((data) => {
        setForecast(data)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err.message || 'Unable to load the weather forecast.')
        setLoading(false)
      })

    return () => controller.abort()
  }, [location, retryKey])

  const handleSearch = async (event) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) return

    const controller = new AbortController()
    setSearching(true)
    setSearchError('')
    try {
      const results = await searchLocations(value, controller.signal)
      if (!results.length) {
        setOptions([])
        setSearchError('No matching locations found.')
      } else {
        setOptions(results)
      }
    } catch (err) {
      if (err.name !== 'AbortError') setSearchError(err.message || 'Unable to search locations.')
    } finally {
      setSearching(false)
    }
  }

  const chooseLocation = (nextLocation) => {
    setLoading(true)
    setError('')
    setLocation(nextLocation)
    setOptions([])
    setQuery(nextLocation.name)
  }

  const locationName = [location.name, location.admin1, location.country].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(', ')
  const current = forecast?.current
  const daily = forecast?.daily

  return (
    <div>
      <PageHeader eyebrow="Weather forecast" title="Plan around local weather" description="Check current conditions and the next seven days of rainfall for the location you choose." />

      <section className="mb-5 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">{t('Search location')}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Search city or location')}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <button type="submit" disabled={searching || !query.trim()} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50">
            {searching ? t('Searching...') : t('Search')}
          </button>
        </form>

        {options.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {options.map((option) => (
              <button
                key={`${option.latitude}-${option.longitude}-${option.name}`}
                type="button"
                onClick={() => chooseLocation(option)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="block font-bold text-emerald-950">{option.name}</span>
                <span className="block text-xs text-slate-500">{[option.admin1, option.country].filter(Boolean).join(', ')}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {searchError && (
        <p role="alert" className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{t(searchError)}</p>
      )}

      {loading && (
        <div className="flex justify-center rounded-2xl bg-white p-8 text-slate-500"><Spinner label="Loading weather forecast..." /></div>
      )}

      {!loading && error && (
        <div role="alert" className="flex flex-col items-start gap-4 rounded-2xl bg-red-50 p-5 text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <p>{t(error)}</p>
          <button type="button" onClick={() => { setLoading(true); setError(''); setRetryKey((key) => key + 1) }} className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100">{t('Retry')}</button>
        </div>
      )}

      {!loading && !error && forecast && (
        <>
          <section className="grid gap-4 rounded-3xl bg-emerald-900 p-5 text-white shadow-sm md:grid-cols-[1fr_auto] md:p-7">
            <div>
              <p className="text-sm font-semibold text-lime-200">{locationName}</p>
              <div className="mt-3 flex items-end gap-4">
                <span className="grid size-16 place-items-center rounded-2xl bg-white/10 text-xl font-bold text-lime-200">{weatherIcon(current?.weather_code)}</span>
                <div>
                  <p className="text-5xl font-bold">{Math.round(current?.temperature_2m ?? 0)}°C</p>
                  <p className="mt-1 text-sm text-emerald-100">{t(weatherCondition(current?.weather_code))}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:min-w-64">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-emerald-100">{t('Humidity')}</p>
                <p className="mt-1 text-2xl font-bold">{current?.relative_humidity_2m ?? '—'}%</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-emerald-100">{t('Feels like')}</p>
                <p className="mt-1 text-2xl font-bold">{Math.round(current?.apparent_temperature ?? 0)}°C</p>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm md:p-7">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-emerald-950">{t('7-day rainfall forecast')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('Daily rain total and chance of precipitation.')}</p>
              </div>
              <span className="text-xs text-slate-400">mm</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {(daily?.time || []).map((dateValue, index) => {
                const rain = Number(daily.rain_sum?.[index] ?? 0)
                const probability = Number(daily.precipitation_probability_max?.[index] ?? 0)
                return (
                  <article key={dateValue} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-4 text-center">
                    <p className="text-xs font-bold text-slate-600">{t(formatDay(dateValue, index))}</p>
                    <p className="mt-3 text-xs text-slate-400">{weatherIcon(daily.weather_code?.[index])}</p>
                    <p className="mt-2 text-lg font-bold text-emerald-700">{rain.toFixed(1)} mm</p>
                    <p className="mt-1 text-xs text-slate-500">{probability}% {t('rain')}</p>
                  </article>
                )
              })}
            </div>
          </section>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            {t('Weather data by Open-Meteo')} · <a className="underline hover:text-emerald-700" href="https://open-meteo.com/" target="_blank" rel="noreferrer">open-meteo.com</a>
          </p>
        </>
      )}
    </div>
  )
}

export default Weather
