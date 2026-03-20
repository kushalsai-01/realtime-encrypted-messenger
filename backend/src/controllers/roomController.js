import * as roomService from '../services/roomService.js'

export async function createRoom(req, res, next) {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const room = await roomService.createRoom(name, req.user.sub)
    res.status(201).json({ success: true, data: room })
  } catch (err) {
    next(err)
  }
}

export async function createDM(req, res, next) {
  try {
    const { targetUserId } = req.body
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' })
    const room = await roomService.createDM(req.user.sub, targetUserId)
    res.status(201).json({ success: true, data: room })
  } catch (err) {
    next(err)
  }
}

export async function listRooms(req, res, next) {
  try {
    const rooms = await roomService.listRooms(req.user.sub)
    res.json({ success: true, data: rooms })
  } catch (err) {
    next(err)
  }
}

export async function getRoom(req, res, next) {
  try {
    const room = await roomService.getRoom(req.params.roomId, req.user.sub)
    res.json({ success: true, data: room })
  } catch (err) {
    next(err)
  }
}

export async function getMembers(req, res, next) {
  try {
    await roomService.assertMember(req.params.roomId, req.user.sub)
    const members = await roomService.getRoomMembers(req.params.roomId)
    res.json({ success: true, data: members })
  } catch (err) {
    next(err)
  }
}

export async function addMember(req, res, next) {
  try {
    const { userId } = req.body
    await roomService.addMember(req.params.roomId, userId, req.user.sub)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function removeMember(req, res, next) {
  try {
    await roomService.removeMember(req.params.roomId, req.params.userId, req.user.sub)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
