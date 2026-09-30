import { Component } from 'react'
import Button from './Button'
import Card from './Card'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-app p-6">
          <Card className="max-w-sm text-center">
            <h1 className="mb-2 text-xl font-bold text-ink">Something went wrong</h1>
            <p className="mb-4 text-sm text-muted">
              An unexpected error occurred. Try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}