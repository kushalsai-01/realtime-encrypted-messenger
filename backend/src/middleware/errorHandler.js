// IMP-7: Sanitize internal error messages in production.
// Previously all err.message values were returned to clients, leaking DB errors,
// stack traces, and internal details. Now 5xx errors return a generic message.
export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  const isProd = process.env.NODE_ENV === 'production'

  // Always log 5xx server errors server-side
  if (status >= 500) console.error('[Error]', err)

  // In production, never expose internal error messages for server errors
  const message = status >= 500 && isProd
    ? 'Internal server error'
    : err.message || 'Internal server error'

  res.status(status).json({ error: message })
}
