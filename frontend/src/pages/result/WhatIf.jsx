import { useOutletContext } from 'react-router-dom'
import CounterfactualSection from '../../components/CounterfactualSection'

function WhatIf() {
    const { result, topCrop } = useOutletContext()

    if (!result.inputs) {
        return <p className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">Your original readings are not available for this result.</p>
    }

    return <CounterfactualSection key={topCrop} inputs={result.inputs} currentCrop={topCrop} />
}

export default WhatIf