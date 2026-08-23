import { ApiError } from '../middleware/errorHandler.js'

/**
 * Wrap an Express handler so thrown errors (sync or async) flow to the
 * centralized error handler instead of hanging.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

/** Throw a 400 with a joined message when `schema` fails to parse input. */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const msg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      return next(new ApiError(400, msg))
    }
    req[source] = result.data
    return next()
  }
}