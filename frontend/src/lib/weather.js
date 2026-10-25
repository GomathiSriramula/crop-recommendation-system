const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export async function searchLocations(query, signal) {
  const url = new URL(GEOCODING_URL)
  url.searchParams.set('name', query)
  url.searchParams.set('count', '8')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Unable to search locations.')

  const data = await response.json()
  return data.results || []
}

export async function fetchWeather({ latitude, longitude }, signal) {
  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', latitude)
  url.searchParams.set('longitude', longitude)
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,apparent_temperature')
  url.searchParams.set('daily', 'weather_code,rain_sum,precipitation_probability_max')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '7')

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Unable to load the weather forecast.')

  return response.json()
}

export function weatherCondition(code) {
  if (code === 0) return 'Clear sky'
  if ([1, 2].includes(code)) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if ([45, 48].includes(code)) return 'Fog'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow'
  if ([95, 96, 99].includes(code)) return 'Thunderstorm'
  return 'Variable conditions'
}

export function weatherIcon(code) {
  if (code === 0) return '☀'
  if ([1, 2].includes(code)) return '⛅'
  if (code === 3) return '☁'
  if ([45, 48].includes(code)) return '≋'
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '☂'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄'
  if ([95, 96, 99].includes(code)) return 'ϟ'
  return '•'
}
