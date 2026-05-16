import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { matches as matchesApi } from '../../services/api';
import { getChatSocket } from '../../utils/socket';
import { FiSend, FiArrowLeft, FiUser } from 'react-icons/fi';

export default function ChatView() {
  const { chatId } = useParams();
  const location = useLocation();
  const matchId = location.state?.matchId;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (matchId) {
      matchesApi.getChat(matchId)
        .then((res) => {
          const chat = res.data.chat;
          setMessages(chat.messages || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.emit('join-chat', chatId);

    socket.on('new-message', (data) => {
      if (data.chatId === chatId) {
        setMessages((prev) => [...prev, data.message]);
      }
    });

    return () => {
      socket.off('new-message');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [chatId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const socket = getChatSocket();
    if (!socket) return;

    socket.emit('send-message', { chatId, content: input });
    setInput('');
  };

  return (
    <div className="page-container max-w-3xl">
      <Link to="/matches" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <FiArrowLeft className="w-4 h-4 mr-1" /> Back to matches
      </Link>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FiUser className="w-4 h-4 text-gray-400" />
            Chat
          </h2>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {loading ? (
            <div className="text-center text-gray-400 py-16">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <FiUser className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No messages yet.</p>
              <p className="text-xs mt-1">Send a message to start the conversation.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.sender === 'me' || msg.messageType === 'me';
              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2.5 rounded-2xl ${msg.messageType === 'system' ? 'bg-gray-200 text-gray-600 italic text-xs mx-auto w-full text-center' : isMe ? 'bg-primary-500 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                    {msg.messageType !== 'system' && (
                      <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    )}
                    {msg.messageType === 'system' && (
                      <p className="text-xs">{msg.content}</p>
                    )}
                    {msg.createdAt && msg.messageType !== 'system' && (
                      <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex gap-3">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="input-field flex-1" placeholder="Type a message..." />
            <button onClick={sendMessage} className="btn-primary px-4">
              <FiSend className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
