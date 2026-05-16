import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { items as itemsApi, matches as matchesApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiCheckCircle, FiPercent, FiMessageCircle, FiCpu, FiSend,
  FiMapPin, FiTag, FiUser, FiAlertCircle, FiRefreshCw,
  FiArrowRight, FiInfo, FiCpu as FiAi,
} from 'react-icons/fi';

const MatchCard = ({ match, onChat, onViewDetails }) => (
  <div className="card border-2 border-green-300 bg-green-50/30">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 truncate">{match.foundItem?.title || 'Found Item'}</h3>
          <span className="badge badge-success text-xs">Strong Match</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
          <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3" /> {match.foundItem?.location}</span>
          <span className="flex items-center gap-1"><FiTag className="w-3 h-3" /> {match.foundItem?.category}</span>
          {match.foundItem?.reportedBy && (
            <span className="flex items-center gap-1"><FiUser className="w-3 h-3" /> {match.foundItem.reportedBy.name}</span>
          )}
        </div>

        {match.aiExplanation && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-start gap-2">
              <FiAi className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800 whitespace-pre-line">{match.aiExplanation}</p>
            </div>
          </div>
        )}
      </div>
      <div className="text-right ml-4 flex flex-col items-end gap-1 flex-shrink-0">
        <div className="text-3xl font-bold text-green-600">{Math.round(match.score)}%</div>
        <div className="w-20 bg-gray-200 rounded-full h-2">
          <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(match.score, 100)}%` }} />
        </div>
      </div>
    </div>
    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
      <button onClick={() => onChat(match)}
        className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
        <FiMessageCircle className="w-4 h-4" /> Chat with Finder
      </button>
      <button onClick={() => onViewDetails(match)}
        className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5">
        View Details <FiArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default function ReportResult() {
  const { itemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state;

  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState(routeState?.matches || []);
  const [matchMethod, setMatchMethod] = useState(routeState?.matchMethod || '');
  const [loading, setLoading] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef(null);

  useEffect(() => {
    itemsApi.getById(itemId)
      .then((res) => setItem(res.data.item))
      .catch(() => { toast.error('Item not found'); navigate('/dashboard'); });
  }, [itemId]);

  useEffect(() => {
    if (!routeState?.matches) {
      matchesApi.getAll()
        .then((res) => {
          const all = res.data.matches || [];
          const itemMatches = all.filter(
            (m) => m.lostItem?._id === itemId || m.lostItem?.toString() === itemId
          );
          setMatches(itemMatches);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  const handleOpenChat = async (match) => {
    try {
      const res = await matchesApi.getChat(match._id);
      navigate(`/chat/${res.data.chat._id}`);
    } catch { toast.error('Could not open chat'); }
  };

  const handleViewDetails = (match) => navigate(`/matches/${match._id}`);

  const askAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const question = aiInput.trim();
    setAiInput('');
    setAiMessages((prev) => [...prev, { role: 'user', content: question }]);
    setAiLoading(true);
    try {
      const res = await matchesApi.askAI(itemId, question);
      setAiMessages((prev) => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch {
      setAiMessages((prev) => [...prev, { role: 'assistant', content: generateLocalAnswer(item, matches, question) }]);
    } finally { setAiLoading(false); }
  };

  if (loading) return (
    <div className="page-container max-w-3xl text-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
      <p className="text-gray-500 text-lg">AI is analyzing your item against found items...</p>
      <p className="text-gray-400 text-sm mt-1">Our AI matching engine is scanning for potential matches.</p>
    </div>
  );

  return (
    <div className="page-container max-w-4xl">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <FiCheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Item Reported Successfully!</h1>
        <p className="text-gray-500 mt-1">{item?.title} &mdash; Lost item</p>
        {matchMethod === 'ai' && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-purple-50 border border-purple-200 rounded-full text-sm text-purple-700">
            <FiAi className="w-4 h-4" /> AI-powered matching
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiPercent className="w-6 h-6 text-primary-500" />
          <h2 className="text-lg font-semibold text-gray-900">AI Match Results</h2>
        </div>
        {matches.length > 0 && (
          <span className="text-sm text-gray-500">
            {matches.length} strong match{matches.length !== 1 ? 'es' : ''} found
          </span>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="card text-center py-12">
          <FiAlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Strong Matches Found</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-2">
            No found items match your lost item at 85% or above. We'll keep scanning as new items are reported.
          </p>
          <p className="text-gray-400 text-sm">You'll be notified immediately when a strong match is found.</p>
          <div className="flex gap-3 justify-center mt-6">
            <Link to="/matches" className="btn-secondary text-sm flex items-center gap-2">
              <FiRefreshCw className="w-4 h-4" /> View All Matches
            </Link>
            <Link to="/dashboard" className="btn-primary text-sm flex items-center gap-2">
              Go to Dashboard <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {matches.map((match) => (
            <MatchCard key={match._id} match={match} onChat={handleOpenChat} onViewDetails={handleViewDetails} />
          ))}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FiCpu className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
          </div>
          <button onClick={() => setAiOpen(!aiOpen)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${aiOpen ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {aiOpen ? 'Hide' : 'Ask AI'}
          </button>
        </div>
        {aiOpen && (
          <div className="space-y-3">
            <div className="h-72 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-xl text-sm">
              {aiMessages.length === 0 && (
                <div className="text-center text-gray-400 py-10">
                  <FiCpu className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>I'm your AI assistant for <strong>{item?.title || 'your item'}</strong>.</p>
                  <p className="text-xs mt-2">Ask me about match results, next steps, or item details.</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {['What are my next steps?', 'How does the AI matching work?', 'Tell me about my item', 'What should I do while waiting?'].map((q) => (
                      <button key={q} onClick={() => setAiInput(q)}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-primary-300 hover:text-primary-600 transition">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-4 py-2.5 rounded-2xl whitespace-pre-line ${msg.role === 'user' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-gray-400 text-sm">
                    <span className="animate-pulse">Thinking</span>
                  </div>
                </div>
              )}
              <div ref={aiEndRef} />
            </div>
            <div className="flex gap-2">
              <input type="text" value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askAI()}
                placeholder="Ask about your item or matches..." className="input-field flex-1" />
              <button onClick={askAI} disabled={aiLoading || !aiInput.trim()} className="btn-primary px-4">
                <FiSend className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center mt-8">
        <Link to="/matches" className="btn-secondary flex items-center gap-2">
          <FiPercent className="w-4 h-4" /> All Matches
        </Link>
        <Link to="/dashboard" className="btn-primary flex items-center gap-2">
          Go to Dashboard <FiArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function generateLocalAnswer(item, matches, question) {
  const q = question.toLowerCase();
  const parts = [];
  if (q.includes('next') || q.includes('step') || q.includes('what should') || q.includes('do')) {
    if (matches.length > 0) {
      parts.push(`Great news! You have ${matches.length} strong match${matches.length > 1 ? 'es' : ''}. Here's what to do:\n\n1. Review each match's AI explanation\n2. Click "Chat with Finder" to discuss details\n3. Arrange pickup or return\n4. Once recovered, mark as resolved`);
    } else {
      parts.push('No strong matches yet. Keep an eye on your matches page. You\'ll be notified when a match is found.');
    }
  }
  if (q.includes('match') || q.includes('score') || q.includes('how does')) {
    parts.push('Our AI compares your item against found items using title, description, category, location, tags, and time proximity. Only matches scoring 85% or higher are shown as strong matches.');
  }
  if (q.includes('tell me') || q.includes('my item') || q.includes('detail')) {
    if (item) {
      parts.push(`Your item: "${item.title}" (${item.category || 'No category'}).`);
      if (item.description) parts.push(`Description: ${item.description.substring(0, 300)}`);
      if (item.location) parts.push(`Last seen at: ${item.location}`);
      if (item.dateOccurred) parts.push(`Date lost: ${new Date(item.dateOccurred).toLocaleDateString()}`);
      parts.push(`Status: ${item.status || 'open'}`);
    }
  }
  if (q.includes('chat') || q.includes('finder') || q.includes('contact')) {
    parts.push('You can chat with finders by clicking "Chat with Finder" on any match card. This opens real-time messaging to coordinate return.');
  }
  if (parts.length === 0) {
    parts.push(`I'm your AI assistant for "${item?.title || 'your item'}". Ask me about match results, next steps, or item details.`);
  }
  return parts.join('\n\n');
}
