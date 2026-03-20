import { query } from '../config/database.js'

export async function me(req, res, next) {
  try {
    const { sub } = req.user
    const result = await query(
      'SELECT id, email, display_name FROM users WHERE id = $1 LIMIT 1',
      [sub]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' })
    const row = result.rows[0]
    return res.json({
      success: true,
      data: { id: row.id, email: row.email, displayName: row.display_name }
    })
  } catch (err) {
    return next(err)
  }
}

export async function setPublicKey(req, res, next) {
  try {
    const { publicKey } = req.body
    if (!publicKey) return res.status(400).json({ error: 'publicKey is required' })
    await query(
      `INSERT INTO user_public_keys (user_id, public_key, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET public_key = $2, updated_at = NOW()`,
      [req.user.sub, publicKey]
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getPublicKey(req, res, next) {
  try {
    const result = await query(
      'SELECT public_key FROM user_public_keys WHERE user_id = $1 LIMIT 1',
      [req.params.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Public key not found' })
    res.json({ success: true, data: { publicKey: result.rows[0].public_key } })
  } catch (err) {
    next(err)
  }
}

export async function searchUsers(req, res, next) {
  try {
    const { q } = req.query
    if (!q || q.length < 2) return res.json({ success: true, data: [] })
    const result = await query(
      `SELECT id, email, display_name FROM users
       WHERE (email ILIKE $1 OR display_name ILIKE $1) AND id != $2
       LIMIT 20`,
      [`%${q}%`, req.user.sub]
    )
    res.json({
      success: true,
      data: result.rows.map((r) => ({ id: r.id, email: r.email, displayName: r.display_name }))
    })
  } catch (err) {
    next(err)
  }
}
