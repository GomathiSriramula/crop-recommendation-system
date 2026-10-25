import { Component } from 'react'

// Without this, one render error blanks the whole app.
class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error, info) {
        console.error('UI error:', error, info.componentStack)
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <div role="alert" className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
                <h1 className="text-2xl font-bold text-emerald-950">Something went wrong</h1>
                <p className="mt-3 text-slate-600">An unexpected error occurred while showing this page.</p>
                <button
                    onClick={() => { this.setState({ hasError: false }); window.location.assign('/') }}
                    className="mt-6 rounded-full bg-emerald-700 px-6 py-2 font-bold text-white hover:bg-emerald-800"
                >
                    Back to home
                </button>
            </div>
        )
    }
}

export default ErrorBoundary
