import { useOutletContext } from 'react-router-dom'
import SoilAnalysisSection from '../../components/SoilAnalysisSection'

function Soil() {
    const { recommendations } = useOutletContext()
    return <SoilAnalysisSection recommendations={recommendations} />
}

export default Soil