import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getChatSocket } from '../../utils/socket';
import { FiSend } from 'react-icons/fi';

export default function ChatView() {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

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
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Chat</h2>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2.5 rounded-2xl ${msg.sender === 'me' ? 'bg-primary-500 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'me' ? 'text-white/70' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
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
