import { useOutletContext } from 'react-router-dom'
import ExplanationSection from '../../components/ExplanationSection'
import useLanguage from '../../context/useLanguage'

function Why() {
    const { result, topCrop } = useOutletContext()
    const { t } = useLanguage()

    if (!result.explanation) {
        return <p className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">{t('No explanation is available for this recommendation.')}</p>
    }

    return <ExplanationSection explanation={result.explanation} crop={result.explanation.crop || topCrop} />
}

export default Why