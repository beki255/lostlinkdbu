import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { matches as matchesApi, chat as chatApi } from '../../services/api';
import { getChatSocket } from '../../utils/socket';
import { FiSend, FiArrowLeft, FiUser, FiClock, FiShield, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function ChatView() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const matchId = location.state?.matchId;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState(null);
  const [typing, setTyping] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    loadChatData();
  }, [chatId]);

  const loadChatData = async () => {
    try {
      const res = await chatApi.getMessages(chatId);
      setMessages(res.data?.messages || []);
      setChatInfo(res.data?.chat);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load messages');
      setLoading(false);
    }
  };

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.emit('join-chat', chatId);

    socket.on('new-message', (data) => {
      if (data.chatId === chatId) {
        setMessages((prev) => [...prev, data.message]);
        setIsOtherTyping(false);
      }
    });

    socket.on('typing', (data) => {
      if (data.chatId === chatId && data.userId !== user._id) {
        setIsOtherTyping(true);
      }
    });

    socket.on('stop-typing', (data) => {
      if (data.chatId === chatId && data.userId !== user._id) {
        setIsOtherTyping(false);
      }
    });

    return () => {
      socket.off('new-message');
      socket.off('typing');
      socket.off('stop-typing');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [chatId]);

  const sendMessage = () => {
    if (!input.trim() || isExpired) return;
    const socket = getChatSocket();
    if (!socket) return;

    socket.emit('send-message', { chatId, content: input });
    socket.emit('stop-typing', { chatId });
    setTyping(false);
    setInput('');
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    const socket = getChatSocket();
    if (!socket) return;

    if (!typing) {
      setTyping(true);
      socket.emit('typing', { chatId });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { chatId });
      setTyping(false);
    }, 3000);
  };

  const isExpired = chatInfo?.expiresAt && new Date() > new Date(chatInfo.expiresAt);

  return (
    <div className="page-container max-w-4xl">
      <Link to="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <FiArrowLeft className="w-4 h-4 mr-1" /> Back to dashboard
      </Link>

      <div className="card p-0 overflow-hidden shadow-2xl border-none">
        {/* Chat Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-primary-600 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <FiUser className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Anonymous Match Chat</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-xs text-white/80">{connected ? 'Live Session' : 'Offline'}</span>
                <span className="text-white/40">|</span>
                <FiShield className="w-3 h-3 text-white/60" />
                <span className="text-[10px] uppercase tracking-wider text-white/60">Anonymous</span>
              </div>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1">Time Remaining</p>
            <div className={`flex items-center gap-2 font-mono font-bold ${isExpired ? 'text-red-300' : 'text-white'}`}>
              <FiClock className="w-4 h-4" />
              {isExpired ? 'EXPIRED' : '72:00:00'}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="h-[500px] overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900/40">
          {isExpired && (
            <div className="flex items-center gap-3 p-4 bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-900/30">
              <FiAlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">This chat session has expired. Messaging is now disabled for security reasons.</p>
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-2xl border border-blue-200 dark:border-blue-900/30">
            <FiShield className="w-5 h-5 shrink-0" />
            <p className="text-xs">Privacy Guard: Personal phone numbers and emails are automatically flagged. Communicate within the platform for your safety.</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4" />
              <p className="text-gray-400 text-sm">Loading secure connection...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-gray-400 dark:text-gray-500">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiMessageCircle className="w-10 h-10 opacity-30" />
              </div>
              <p className="font-medium">Secure match confirmed!</p>
              <p className="text-xs mt-1">Start a conversation to arrange the item handover.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.sender?._id === user._id || msg.sender === user._id;
              const isSystem = msg.messageType === 'system';

              if (isSystem) {
                return (
                  <div key={i} className="flex justify-center my-4">
                    <span className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full text-[10px] uppercase tracking-widest font-bold">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                    <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                      isMe 
                        ? 'bg-primary-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-none'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[10px] mt-1 text-gray-400 dark:text-gray-500 font-medium uppercase tracking-tighter">
                      {isMe ? 'You' : 'Match Partner'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          {isOtherTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl rounded-tl-none border border-gray-200 dark:border-gray-700">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={input} 
                onChange={handleTyping}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isExpired}
                className="w-full pl-4 pr-12 py-3.5 bg-gray-100 dark:bg-gray-900/50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 text-sm transition-all dark:text-white disabled:opacity-50" 
                placeholder={isExpired ? "Chat session expired" : "Secure message..."} 
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${input.length > 0 ? 'bg-primary-500' : 'bg-gray-300'}`} />
              </div>
            </div>
            <button 
              onClick={sendMessage} 
              disabled={!input.trim() || isExpired}
              className="w-14 h-14 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-primary-500/20 active:scale-95"
            >
              <FiSend className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

