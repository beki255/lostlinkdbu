const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const connectedUsers = new Map();

const setupChatSocket = (io) => {
  const chatNamespace = io.of('/chat');

  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId);
      if (!user || user.isDeleted) return next(new Error('User not found'));

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  chatNamespace.on('connection', (socket) => {
    connectedUsers.set(socket.userId, socket.id);
    console.log(`Chat user connected: ${socket.userId}`);

    socket.on('join-chat', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat || chat.isDeleted) {
          return socket.emit('error', { message: 'Chat not found' });
        }

        const isParticipant = chat.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isParticipant && socket.userRole === 'user') {
          return socket.emit('error', { message: 'Access denied' });
        }

        socket.join(chatId);
        socket.currentChat = chatId;

        await Chat.findByIdAndUpdate(chatId, { lastActivity: new Date() });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    socket.on('send-message', async (data) => {
      try {
        const { chatId, content, messageType } = data;

        const chat = await Chat.findById(chatId);
        if (!chat || chat.isDeleted) return;

        const isParticipant = chat.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isParticipant && socket.userRole === 'user') return;

        const message = {
          sender: socket.userId,
          content,
          messageType: messageType || 'text',
          deliveredAt: new Date(),
        };

        chat.messages.push(message);
        chat.lastActivity = new Date();
        await chat.save();

        const populatedChat = await Chat.findById(chatId)
          .populate('messages.sender', 'name role');

        const lastMessage = populatedChat.messages[populatedChat.messages.length - 1];

        chatNamespace.to(chatId).emit('new-message', {
          chatId,
          message: lastMessage,
        });

        // Notify other participants
        for (const participant of chat.participants) {
          const pid = participant.toString();
          if (pid !== socket.userId) {
            await Notification.create({
              recipient: pid,
              type: 'new_message',
              title: 'New Message',
              message: 'You have a new message in your chat.',
              data: { chatId, itemId: chat.item },
            });
          }
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data) => {
      const { chatId } = data;
      socket.to(chatId).emit('typing', { chatId, userId: socket.userId });
    });

    socket.on('stop-typing', (data) => {
      const { chatId } = data;
      socket.to(chatId).emit('stop-typing', { chatId, userId: socket.userId });
    });

    socket.on('mark-read', async (data) => {
      try {
        const { chatId, messageIds } = data;
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        chat.messages.forEach((msg) => {
          if (messageIds.includes(msg._id.toString()) && !msg.readAt) {
            msg.readAt = new Date();
          }
        });
        await chat.save();

        chatNamespace.to(chatId).emit('messages-read', { chatId, messageIds });
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.userId);
      console.log(`Chat user disconnected: ${socket.userId}`);
    });
  });
};

module.exports = { setupChatSocket, connectedUsers };
