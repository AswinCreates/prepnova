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
  const status = err.statusCode || 500
  if (status >= 500) console.error('Unhandled error:', err)
  res.status(status).json({ message: err.message || 'Internal server error' })
}