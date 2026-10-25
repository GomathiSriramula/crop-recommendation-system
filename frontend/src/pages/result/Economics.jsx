import { useOutletContext } from 'react-router-dom'
import EconomicsSection from '../../components/EconomicsSection'

function Economics() {
    const { recommendations } = useOutletContext()
    return <EconomicsSection recommendations={recommendations} />
}

export default Economics