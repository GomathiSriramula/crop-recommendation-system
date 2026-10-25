export function soilStatusClasses(status) {
    if (status === 'Optimal') return 'bg-emerald-100 text-emerald-800'
    if (status === 'Low') return 'bg-amber-100 text-amber-800'
    return 'bg-red-100 text-red-800'
}
