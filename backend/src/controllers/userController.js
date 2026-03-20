import { query } from '../config/database.js'

export async function me(req, res, next) {
  try {
    const { sub } = req.user
    const result = await query('SELECT id, email, display_name FROM users WHERE id = $1 LIMIT 1', [sub])
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const row = result.rows[0]
    return res.json({ id: row.id, email: row.email, displayName: row.display_name })
  } catch (err) {
    return next(err)
  }
}
