import * as messageService from '../services/messageService.js'

export async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params
    const messages = await messageService.listMessages(conversationId)
    res.json(messages)
  } catch (err) {
    next(err)
  }
}
