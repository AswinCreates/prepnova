/**
 * Standard application errors and Express error-handling middleware.
 */
export function ApiError(statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

export function notFound(req, res) {
  res.status(404).json({ message: 'Endpoint not found' })
}

export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Audio upload is too large. Please record a shorter answer and try again.' })
  }
  if (status >= 500) console.error('Unhandled error:', err)
  res.status(status).json({ message: err.message || 'Internal server error' })
}
