import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { languageOptions, translations } from './translations'

const STORAGE_KEY = 'soilwise-language'
const LanguageContext = createContext(null)

function getInitialLanguage() {
  const savedLanguage = window.localStorage.getItem(STORAGE_KEY)
  return languageOptions.some(({ code }) => code === savedLanguage) ? savedLanguage : 'en'
}

function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((nextLanguage) => {
    if (!languageOptions.some(({ code }) => code === nextLanguage)) {
      throw new Error(`Unsupported language: ${nextLanguage}`)
    }
    window.localStorage.setItem(STORAGE_KEY, nextLanguage)
    document.documentElement.lang = nextLanguage
    setLanguageState(nextLanguage)
  }, [])

  const t = useCallback((text, values) => {
    if (typeof text !== 'string') return text

    const translatePhrase = (phrase) => {
      const languageDictionary = translations[language]
      let result = languageDictionary && Object.hasOwn(languageDictionary, phrase)
        ? languageDictionary[phrase]
        : undefined
      if (!result && language !== 'en') {
        const localRange = phrase.match(/^Use a value from ([\d.]+) to ([\d.]+)\.$/)
        const apiRange = phrase.match(/^(?:N|P|K|temperature|humidity|ph|rainfall) must be a number between ([\d.]+) and ([\d.]+)$/)
        const passwordLimit = phrase.match(/^Password must be at most (\d+) bytes\.?$/)
        const queryLimit = phrase.match(/^limit must be between (\d+) and (\d+)$/)
        if (localRange || apiRange) {
          const [, min, max] = localRange || apiRange
          const template = localRange
            ? 'Use a value from {min} to {max}.'
            : 'Value must be a number between {min} and {max}.'
          result = translations[language]?.[template]?.replace('{min}', min).replace('{max}', max)
        } else if (passwordLimit) {
          const template = phrase.endsWith('.') ? 'Password must be at most {bytes} bytes.' : 'Password must be at most {bytes} bytes'
          result = translations[language]?.[template]
            ?.replace('{bytes}', passwordLimit[1])
        } else if (queryLimit) {
          result = translations[language]?.['limit must be between {min} and {max}']
            ?.replace('{min}', queryLimit[1])
            .replace('{max}', queryLimit[2])
        }
      }
      return result || phrase
    }

    let translated = translatePhrase(text)
    if (translated === text && language !== 'en') {
      const errorPhrases = [
        'Name is required', 'Name must be 2-100 characters', 'Enter a valid email address',
        'Password is required', 'Password must be at least 8 characters', 'Password is too long',
        'target_crop is required', 'target_crop must be a crop name', 'page must be a positive integer',
        'Invalid prediction id', 'Email is already registered', 'Invalid email or password',
        'User account no longer exists', 'Prediction not found', 'Request validation failed',
        'The ML service took too long to respond', 'ML service returned an error',
        'ML service is unavailable', 'Request body is not valid JSON', 'Request body is too large',
        'Invalid identifier', 'Too many requests, please try again later',
        'Too many authentication attempts, please try again later',
        'Too many counterfactual requests, please slow down', 'Authentication token is required',
        'Invalid or expired authentication token', 'ML service returned an invalid explanation',
        'ML service returned an invalid recommendation', 'ML service returned an invalid counterfactual',
        'ML service returned invalid feature importance', 'Internal server error',
      ]
      translated = errorPhrases.reduce((message, phrase) => {
        if (!message.includes(phrase)) return message
        return message.replaceAll(phrase, translatePhrase(phrase))
      }, text)
      translated = translated.replace(
        /(?:N|P|K|temperature|humidity|ph|rainfall) must be a number between [\d.]+ and [\d.]+|Password must be at most \d+ bytes\.?|limit must be between \d+ and \d+/g,
        translatePhrase,
      )
    }
    translated ||= text
    if (!values) return translated
    return translated.replace(/\{(\w+)\}/g, (match, key) => (
      Object.hasOwn(values, key) ? String(values[key]) : match
    ))
  }, [language])

  const value = useMemo(() => ({ language, languageOptions, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export { LanguageContext, LanguageProvider }
