import * as authService from '../services/authService.js'

function getMeta(req) {
  return {
    ip: req.ip || req.socket?.remoteAddress,
    deviceName: req.headers['user-agent']?.slice(0, 100)
  }
}

export async function register(req, res, next) {
  try {
    const data = await authService.register(req.body, getMeta(req))
    res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const data = await authService.login(req.body, getMeta(req))
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function refresh(req, res, next) {
  try {
    const tokens = await authService.refresh(req.body.refreshToken)
    res.json({ success: true, data: tokens })
  } catch (err) {
    next(err)
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logout(req.user?.jti, req.body?.refreshToken)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        id: req.user.sub,
        email: req.user.email,
        displayName: req.user.name
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function getSessions(req, res, next) {
  try {
    const sessions = await authService.listSessions(req.user.sub)
    res.json({ success: true, data: sessions })
  } catch (err) {
    next(err)
  }
}

export async function revokeSession(req, res, next) {
  try {
    await authService.revokeSession(req.params.sessionId, req.user.sub)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function revokeAllSessions(req, res, next) {
  try {
    await authService.revokeAllSessions(req.user.sub)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
