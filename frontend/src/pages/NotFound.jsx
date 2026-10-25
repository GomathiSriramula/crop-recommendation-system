import { Link } from 'react-router-dom'
import useLanguage from '../context/useLanguage'

function NotFound() {
    const { t } = useLanguage()
    return (
        <div className="py-20 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">404</p>
            <h1 className="mt-3 text-4xl font-bold text-emerald-950">{t('Page not found')}</h1>
            <p className="mt-3 text-slate-600">{t('The page you are looking for does not exist.')}</p>
            <Link className="mt-6 inline-block rounded-full bg-emerald-700 px-6 py-2 font-bold text-white hover:bg-emerald-800" to="/">
                {t('Back to home')}
            </Link>
        </div>
    )
}

export default NotFound
