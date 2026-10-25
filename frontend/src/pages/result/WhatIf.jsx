import { useOutletContext } from 'react-router-dom'
import CounterfactualSection from '../../components/CounterfactualSection'
import useLanguage from '../../context/useLanguage'

function WhatIf() {
    const { result, topCrop } = useOutletContext()
    const { t } = useLanguage()

    if (!result.inputs) {
        return <p className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">{t('Your original readings are not available for this result.')}</p>
    }

    return <CounterfactualSection key={topCrop} inputs={result.inputs} currentCrop={topCrop} />
}

export default WhatIf