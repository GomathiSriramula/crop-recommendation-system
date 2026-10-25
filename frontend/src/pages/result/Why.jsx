import { useOutletContext } from 'react-router-dom'
import ExplanationSection from '../../components/ExplanationSection'

function Why() {
    const { result, topCrop } = useOutletContext()

    if (!result.explanation) {
        return <p className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">No explanation is available for this recommendation.</p>
    }

    return <ExplanationSection explanation={result.explanation} crop={result.explanation.crop || topCrop} />
}

export default Why