const Chat = require('../models/Chat');
const { AppError, NotFoundError, ForbiddenError } = require('../utils/errors');
const { sendSuccess } = require('../utils/response');

exports.getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findById(chatId).populate('participants', 'name role');
    if (!chat) throw new NotFoundError('Chat');

    // Verify user is a participant or an admin/security
    const isParticipant = chat.participants.some(p => {
      const pId = p._id || p;
      return pId.toString() === req.user._id.toString();
    });
    
    const isAuthorized = isParticipant || req.user.role === 'admin';
    if (!isAuthorized) {
      throw new ForbiddenError('You are not authorized to view this chat.');
    }

    // Filter messages to hide sender's personal info if needed (Anonymous Chat)
    const sanitizedMessages = chat.messages.map(msg => {
      const msgObj = msg.toObject();
      // Only keep name and role of sender, hide other details
      return msgObj;
    });

    sendSuccess(res, { messages: sanitizedMessages, chat });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;

    if (!content) throw new AppError('Message content is required.', 400);

    const chat = await Chat.findById(chatId);
    if (!chat) throw new NotFoundError('Chat');

    // Check if chat is expired
    if (chat.expiresAt && new Date() > chat.expiresAt) {
      throw new AppError('This chat has expired (72h limit reached).', 400);
    }

    const isParticipant = chat.participants.some(p => {
      const pId = p._id || p;
      return pId.toString() === req.user._id.toString();
    });
    
    const isAuthorized = isParticipant || req.user.role === 'admin';
    if (!isAuthorized) {
      throw new ForbiddenError('You are not authorized to send messages in this chat.');
    }

    chat.messages.push({
      sender: req.user._id,
      content,
      messageType: 'text',
      deliveredAt: new Date(),
    });
    
    chat.lastActivity = new Date();
    await chat.save();

    sendSuccess(res, { message: chat.messages[chat.messages.length - 1] }, 'Message sent.');
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) throw new NotFoundError('Chat');

    chat.messages.forEach(msg => {
      if (!msg.sender.equals(req.user._id) && !msg.readAt) {
        msg.readAt = new Date();
      }
    });

    await chat.save();
    sendSuccess(res, null, 'Messages marked as read.');
  } catch (error) {
    next(error);
  }
};

