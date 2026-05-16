import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { matches as matchesApi, items as itemsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiMessageCircle, FiCheckCircle, FiXCircle,
  FiSend, FiCpu, FiUser, FiMapPin, FiCalendar, FiTag, FiPercent, FiInfo,
} from 'react-icons/fi';

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
  const [chatId, setChatId] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef(null);

  useEffect(() => {
    matchesApi.getById(id)
      .then((res) => setMatch(res.data.match))
      .catch(() => { toast.error('Match not found'); navigate('/matches'); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  const openChat = async () => {
    setChatLoading(true);
    try {
      const res = await matchesApi.getChat(id);
      const cid = res.data.chat._id;
      setChatId(cid);
      navigate(`/chat/${cid}`);
    } catch (err) {
      toast.error('Failed to open chat');
    } finally {
      setChatLoading(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      await matchesApi.updateStatus(id, status);
      setMatch((prev) => ({ ...prev, status }));
      toast.success(`Match ${status}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const askAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const question = aiInput.trim();
    setAiInput('');
    setAiMessages((prev) => [...prev, { role: 'user', content: question }]);
    setAiLoading(true);
    try {
      const res = await matchesApi.askAI(id, question);
      setAiMessages((prev) => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch (err) {
      setAiMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not process that request.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div className="page-container text-center py-16 text-gray-500">Loading...</div>;
  if (!match) return null;

  const levelColor = match.score >= 85 ? 'text-green-600' : match.score >= 50 ? 'text-yellow-600' : 'text-gray-400';
  const levelBg = match.score >= 85 ? 'bg-green-50 border-green-200' : match.score >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200';
  const levelLabel = match.score >= 85 ? 'Strong Match' : match.score >= 50 ? 'Moderate Match' : 'Low Match';

  return (
    <div className="page-container max-w-4xl">
      <Link to="/matches" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <FiArrowLeft className="w-4 h-4 mr-1" /> Back to matches
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`card border-2 ${levelBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">Match Results</h1>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${match.score >= 85 ? 'bg-green-100 text-green-700' : match.score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                {levelLabel}
              </span>
            </div>

            <div className="flex items-center gap-6 mb-6">
              <div className="text-center">
                <div className={`text-5xl font-bold ${levelColor}`}>{Math.round(match.score)}%</div>
                <p className="text-sm text-gray-500 mt-1">Overall Match</p>
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className={`h-4 rounded-full ${match.score >= 85 ? 'bg-green-500' : match.score >= 50 ? 'bg-yellow-500' : 'bg-gray-300'}`}
                    style={{ width: `${Math.min(match.score, 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {scoreBars.map((sb) => {
                const val = match.details?.[sb.key] || 0;
                const contrib = Math.round(val * sb.weight / 100);
                return (
                  <div key={sb.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{sb.label} ({sb.weight}%)</span>
                      <span className="font-medium text-gray-900">{val}% (contributed {contrib}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary-500" style={{ width: `${val}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {match.aiExplanation && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <FiInfo className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">AI Explanation</h3>
                    <p className="text-sm text-blue-800 whitespace-pre-line">{match.aiExplanation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Your Lost Item</h2>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <FiPercent className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{match.lostItem?.title}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3" /> {match.lostItem?.location}</span>
                  <span className="flex items-center gap-1"><FiTag className="w-3 h-3" /> {match.lostItem?.category}</span>
                  {match.lostItem?.dateOccurred && (
                    <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> {new Date(match.lostItem.dateOccurred).toLocaleDateString()}</span>
                  )}
                </div>
                {match.lostItem?.description && (
                  <p className="text-sm text-gray-600 mt-2">{match.lostItem.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Found Item</h2>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <FiPercent className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{match.foundItem?.title}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3" /> {match.foundItem?.location}</span>
                  <span className="flex items-center gap-1"><FiTag className="w-3 h-3" /> {match.foundItem?.category}</span>
                  {match.foundItem?.dateOccurred && (
                    <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> {new Date(match.foundItem.dateOccurred).toLocaleDateString()}</span>
                  )}
                </div>
                {match.foundItem?.description && (
                  <p className="text-sm text-gray-600 mt-2">{match.foundItem.description}</p>
                )}
                {match.foundItem?.reportedBy && (
                  <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                    <FiUser className="w-3 h-3" /> Found by: {match.foundItem.reportedBy.name} &middot; {match.foundItem.reportedBy.department || ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Actions</h2>
            <div className="space-y-3">
              <button onClick={openChat} disabled={chatLoading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <FiMessageCircle className="w-4 h-4" />
                {chatLoading ? 'Opening...' : 'Chat with Finder'}
              </button>

              <button onClick={() => updateStatus('contacted')}
                disabled={match.status === 'contacted' || match.status === 'resolved'}
                className="btn-secondary w-full flex items-center justify-center gap-2">
                <FiMessageCircle className="w-4 h-4" />
                Mark Contacted
              </button>

              <button onClick={() => updateStatus('resolved')}
                disabled={match.status === 'resolved'}
                className="w-full py-2.5 rounded-xl font-medium text-sm bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2">
                <FiCheckCircle className="w-4 h-4" />
                Mark Resolved
              </button>

              <button onClick={() => updateStatus('dismissed')}
                disabled={match.status === 'dismissed'}
                className="w-full py-2.5 rounded-xl font-medium text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2">
                <FiXCircle className="w-4 h-4" />
                Dismiss Match
              </button>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">AI Assistant</h2>
              <button onClick={() => setAiOpen(!aiOpen)}
                className={`p-2 rounded-lg transition ${aiOpen ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}>
                <FiCpu className="w-5 h-5" />
              </button>
            </div>
            {aiOpen && (
              <div className="space-y-3">
                <div className="h-64 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-xl text-sm">
                  {aiMessages.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      <FiCpu className="w-8 h-8 mx-auto mb-2" />
                      <p>Ask me about this match.</p>
                      <p className="text-xs mt-1">Try: "What's the match score?" or "What should I do next?"</p>
                    </div>
                  )}
                  {aiMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-xl whitespace-pre-line ${msg.role === 'user' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-400 text-sm">
                        Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={aiEndRef} />
                </div>
                <div className="flex gap-2">
                  <input type="text" value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && askAI()}
                    placeholder="Ask about this match..."
                    className="input-field flex-1 text-sm" />
                  <button onClick={askAI} disabled={aiLoading || !aiInput.trim()}
                    className="btn-primary px-3">
                    <FiSend className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
