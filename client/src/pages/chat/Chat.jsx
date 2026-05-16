import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { chat as chatApi } from '../../services/api';
import { FiSend, FiMessageCircle, FiClock, FiX, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { getToken } from '../../utils/auth';
import { useAuth } from '../../context/AuthContext';

export default function Chat() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState(null);
  const scrollRef = useRef(null);

  const socketRef = useRef(null);

  useEffect(() => {
    loadChat();

    // Initialize Socket.io
    const token = getToken();
    const socket = io('/chat', {
      auth: { token },
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-chat', chatId);
    });

    socket.on('new-message', (data) => {
      if (data.chatId === chatId) {
        setMessages((prev) => [...prev, data.message]);
      }
    });

    socket.on('error', (err) => {
      toast.error(err.message || 'Socket error');
    });

    return () => {
      socket.disconnect();
    };
  }, [chatId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChat = async () => {
    try {
      const res = await chatApi.getMessages(chatId);
      setMessages(res.data?.messages || []);
      setChatInfo(res.data?.chat);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load chat');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Use socket to send message for real-time
    socketRef.current?.emit('send-message', {
      chatId,
      content: newMessage,
      messageType: 'text'
    });
    setNewMessage('');
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading chat...</div>;

  const isExpired = chatInfo?.expiresAt && new Date() > new Date(chatInfo.expiresAt);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 bg-primary-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <FiMessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold">Anonymous Match Chat</h2>
            <p className="text-xs text-white/70 flex items-center gap-1">
              <FiShield className="w-3 h-3" /> Secure & Encrypted
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/80 font-medium">Auto-expires in:</p>
          <p className="text-sm font-bold flex items-center justify-end gap-1">
            <FiClock className="w-3 h-3" /> 
            {isExpired ? 'Expired' : '72 Hours'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
        {isExpired && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl text-center border border-red-100 dark:border-red-900/30">
            This chat has expired and is now read-only.
          </div>
        )}
        
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-xl text-center border border-blue-100 dark:border-blue-900/30">
          For your safety, do not share personal contact information or phone numbers here.
        </div>

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <FiMessageCircle className="w-12 h-12 mb-2 opacity-20" />
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender._id === user._id || msg.sender === user._id;
            return (
              <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl ${
                  isMe 
                    ? 'bg-primary-600 text-white rounded-tr-none shadow-md' 
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-600 shadow-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 opacity-60 text-right`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      {!isExpired && (
        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm dark:text-white"
          />
          <button type="submit" disabled={!newMessage.trim()}
            className="w-12 h-12 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg">
            <FiSend className="w-5 h-5" />
          </button>
        </form>
      )}
    </div>
  );
}
