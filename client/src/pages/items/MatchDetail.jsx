import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { matches as matchesApi, chat as chatsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiMessageCircle, FiCheckCircle, FiXCircle,
  FiSend, FiCpu, FiUser, FiMapPin, FiCalendar, FiTag, FiPercent, FiInfo,
  FiPhone, FiMail, FiShield
} from 'react-icons/fi';
import { io } from 'socket.io-client';
import { getToken } from '../../utils/auth';

const scoreBars = [
  { key: 'titleScore', label: 'Title', weight: 25 },
  { key: 'descriptionScore', label: 'Description', weight: 25 },
  { key: 'categoryScore', label: 'Category', weight: 20 },
  { key: 'locationScore', label: 'Location', weight: 15 },
  { key: 'tagScore', label: 'Tags', weight: 10 },
  { key: 'timeScore', label: 'Time', weight: 5 },
];

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatInfo, setChatInfo] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    matchesApi.getById(id)
      .then((res) => {
        const m = res.data.match;
        // If resolved and user is not admin, redirect away
        if (m.status === 'resolved' && user?.role !== 'admin') {
          toast.success('This item has been successfully recovered! 🎉');
          navigate('/items');
          return;
        }
        setMatch(m);
      })
      .catch(() => { toast.error('Match not found'); navigate('/items'); })
      .finally(() => setLoading(false));
  }, [id, navigate, user]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
    if (chatOpen && chatInfo?._id) {
      const socket = io('/chat', {
        auth: { token: getToken() },
        transports: ['websocket']
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('join-chat', chatInfo._id);
      });

      socket.on('disconnect', () => setSocketConnected(false));

      socket.on('new-message', (data) => {
        if (data.chatId === chatInfo._id) {
          setChatMessages((prev) => [...prev, data.message]);
          setIsOtherTyping(false);
        }
      });

      socket.on('typing', (data) => {
        if (data.chatId === chatInfo._id && data.userId !== user._id) {
          setIsOtherTyping(true);
        }
      });

      socket.on('stop-typing', (data) => {
        if (data.chatId === chatInfo._id && data.userId !== user._id) {
          setIsOtherTyping(false);
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [chatOpen, chatInfo?._id, user._id]);

  const isLostOwner = match?.lostItem?.reportedBy?._id === user?._id;

  const toggleChat = async () => {
    if (chatOpen) {
      setChatOpen(false);
      return;
    }

    setChatLoading(true);
    try {
      const res = await matchesApi.getChat(id);
      setChatInfo(res.data.chat);
      setChatMessages(res.data.chat.messages || []);
      setChatOpen(true);
    } catch (err) {
      toast.error('Failed to open chat');
    } finally {
      setChatLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !socketRef.current || !chatInfo) return;
    
    const content = chatInput.trim();
    const tempMessage = {
      _id: Date.now().toString(),
      sender: { _id: user._id, name: user.name },
      content,
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    setChatMessages(prev => [...prev, tempMessage]);
    setChatInput('');
    setIsTyping(false);
    socketRef.current.emit('stop-typing', { chatId: chatInfo._id });

    try {
      // Save to database
      await chatsApi.sendMessage(chatInfo._id, { content });
      
      // Emit via socket for real-time
      socketRef.current.emit('send-message', {
        chatId: chatInfo._id,
        content
      });
    } catch (err) {
      toast.error('Failed to save message history');
    }
  };

  const handleChatTyping = (e) => {
    setChatInput(e.target.value);
    if (!socketRef.current || !chatInfo) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { chatId: chatInfo._id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('stop-typing', { chatId: chatInfo._id });
      setIsTyping(false);
    }, 3000);
  };

  const updateStatus = async (status) => {
    try {
      await matchesApi.updateStatus(id, status);
      setMatch((prev) => ({ ...prev, status }));
      toast.success(`Status updated to ${status}`);
    } catch (err) {
      toast.error(err.message);
    }
  };


  if (loading) return <div className="page-container text-center py-16 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!match) return null;

  const levelColor = match.score >= 85 ? 'text-green-600 dark:text-green-400' : match.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500';
  const levelBg = match.score >= 85 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : match.score >= 50 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
  const levelLabel = match.score >= 85 ? 'Strong Match' : match.score >= 50 ? 'Moderate Match' : 'Low Match';

  const otherPartyName = isLostOwner
    ? match.foundItem?.reportedBy?.name || 'the finder'
    : match.lostItem?.reportedBy?.name || 'the owner';

  return (
    <>
      <div className="page-container max-w-4xl">
        <Link to="/items" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
          <FiArrowLeft className="w-4 h-4 mr-1" /> Back to Find Item
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className={`card border-2 ${levelBg}`}>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Match Results</h1>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${match.score >= 85 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : match.score >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {levelLabel}
                </span>
              </div>
              
              <div className="flex items-center gap-6 mb-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${levelColor}`}>{Math.round(match.score)}%</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overall Match</p>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                    <div className={`h-4 rounded-full ${match.score >= 85 ? 'bg-green-500' : match.score >= 50 ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-500'}`}
                      style={{ width: `${Math.min(match.score, 100)}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {scoreBars.map((sb) => {
                  const val = match.details?.[sb.key] || 0;
                  return (
                    <div key={sb.key} className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">{sb.label}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{val}%</span>
                        <div className="w-8 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${val >= 85 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${val}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Comparison</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Live Analysis</span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <FiShield className="w-4 h-4 text-red-500" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase">Lost Item</h3>
                  </div>
                  <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
                    {match.lostItem?.images?.[0] ? (
                      <img src={match.lostItem.images[0].url} alt="Lost" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">{match.lostItem?.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <FiMapPin className="w-3 h-3" /> {match.lostItem?.location}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <FiShield className="w-4 h-4 text-green-500" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase">Found Match</h3>
                  </div>
                  <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
                    {match.foundItem?.images?.[0] ? (
                      <img src={match.foundItem.images[0].url} alt="Found" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">{match.foundItem?.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <FiMapPin className="w-3 h-3" /> {match.foundItem?.location}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {match.aiExplanation && (
              <div className="card bg-primary-50/50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                    <FiCpu className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">AI Match Confidence Analysis</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                      "{match.aiExplanation}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Contact Information</h2>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 flex items-center justify-center overflow-hidden shadow-sm">
                    {(isLostOwner ? match.foundItem?.reportedBy?.avatar : match.lostItem?.reportedBy?.avatar) ? (
                      <img 
                        src={isLostOwner ? match.foundItem.reportedBy.avatar : match.lostItem.reportedBy.avatar} 
                        alt={otherPartyName} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <FiUser className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{otherPartyName}</p>
                    <p className="text-xs text-gray-500 uppercase">{isLostOwner ? 'Finder' : 'Owner'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <a href={`mailto:${isLostOwner ? match.foundItem.reportedBy.email : match.lostItem.reportedBy.email}`} 
                     className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary-500 transition-colors group">
                    <FiMail className="w-4 h-4 text-primary-500" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase">Email</p>
                      <p className="text-xs font-medium truncate">{isLostOwner ? match.foundItem.reportedBy.email : match.lostItem.reportedBy.email}</p>
                    </div>
                  </a>
                  {(isLostOwner ? match.foundItem.reportedBy.phone : match.lostItem.reportedBy.phone) && (
                    <a href={`tel:${isLostOwner ? match.foundItem.reportedBy.phone : match.lostItem.reportedBy.phone}`}
                       className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-green-500 transition-colors group">
                      <FiPhone className="w-4 h-4 text-green-500" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase">Phone</p>
                        <p className="text-xs font-medium truncate">{isLostOwner ? match.foundItem.reportedBy.phone : match.lostItem.reportedBy.phone}</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Actions</h2>
              <div className="space-y-3">
                <button onClick={() => updateStatus('contacted')}
                  disabled={match.status === 'contacted' || match.status === 'resolved'}
                  className="btn-secondary w-full flex items-center justify-center gap-2">
                  Mark Contacted
                </button>

                {isLostOwner && (
                  <button onClick={() => updateStatus('resolved')}
                    disabled={match.status === 'resolved'}
                    className="w-full py-2.5 rounded-xl font-medium text-sm bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2">
                    <FiCheckCircle className="w-4 h-4" />
                    I Received
                  </button>
                )}

                <button onClick={() => updateStatus('dismissed')}
                  disabled={match.status === 'dismissed' || match.status === 'resolved'}
                  className="w-full py-2.5 rounded-xl font-medium text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  <FiXCircle className="w-4 h-4" />
                  Dismiss Match
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>>

      {/* Floating Real-Time Chat Widget (The "One Button" Always) */}
      <div className="fixed bottom-6 right-6 z-[60]">
        {!chatOpen ? (
          <button 
            onClick={toggleChat}
            disabled={chatLoading}
            className="w-16 h-16 bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-primary-700 transition-all active:scale-95 group relative"
          >
            {chatLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="font-bold text-xs uppercase tracking-tighter">Chat</span>
            )}
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
            <div className="absolute right-full mr-4 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
              Chat with {otherPartyName}
            </div>
          </button>
        ) : (
          <div className="w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col">
            {/* Widget Header */}
            <div className="px-4 py-3 bg-primary-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">
                  {otherPartyName[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold leading-none">{otherPartyName}</p>
                  <p className="text-[10px] opacity-70 mt-0.5 uppercase tracking-widest">Direct Message</p>
                </div>
              </div>
              <button onClick={toggleChat} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Widget Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/40 scroll-smooth">
              <div className="text-center py-2">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 inline-block px-3 py-1 rounded-full uppercase tracking-tighter">
                  This is a secure, anonymous chat for item recovery coordination.
                </p>
              </div>

              {chatMessages.map((msg, i) => {
                const isMe = msg.sender?._id === user._id || msg.sender === user._id;
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl shadow-sm ${
                      isMe 
                        ? 'bg-primary-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                    }`}>
                      <p className="text-xs leading-relaxed">{msg.content}</p>
                      <span className="text-[8px] opacity-60 block text-right mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isOtherTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Widget Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={handleChatTyping}
                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder={match.status === 'resolved' ? "Chat disabled for resolved matches" : "Type a message..."}
                  disabled={match.status === 'resolved'}
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-900/50 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary-500 text-xs transition-all dark:text-white disabled:opacity-50" 
                />
                <button 
                  onClick={sendChatMessage} 
                  disabled={!chatInput.trim() || match.status === 'resolved'}
                  className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-primary-500/20"
                >
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
