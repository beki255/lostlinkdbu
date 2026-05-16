import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { items as itemsApi, matches as matchesApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiCheckCircle, FiPercent, FiMessageCircle, FiSend,
  FiMapPin, FiTag, FiUser, FiAlertCircle, FiRefreshCw,
  FiArrowRight, FiInfo, FiMail, FiPhone, FiPackage, FiSearch
} from 'react-icons/fi';

const MatchCard = ({ match, onChat, onSelect }) => (
  <div className="card border-2 border-green-300 bg-green-50/30 dark:border-green-800 dark:bg-green-900/10 p-0 overflow-hidden">
    <div className="flex flex-col sm:flex-row">
      {/* Image Section */}
      <div className="w-full sm:w-48 h-48 flex-shrink-0 bg-gray-200 dark:bg-gray-700 relative">
        {match.score < 65 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-800 p-4 text-center">
            <FiInfo className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-[10px] italic">Image hidden until match ≥ 65%</p>
          </div>
        ) : match.foundItem?.images?.[0]?.url ? (
          <img src={match.foundItem.images[0].url} alt={match.foundItem.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <FiPackage className="w-12 h-12 opacity-20" />
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded-md shadow-lg">
          {Math.round(match.score)}% MATCH
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate">{match.foundItem?.title || 'Found Item'}</h3>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3 text-primary-500" /> {match.foundItem?.location}</span>
            <span className="flex items-center gap-1"><FiTag className="w-3 h-3 text-primary-500" /> {match.foundItem?.category}</span>
          </div>

          {match.foundItem?.reportedBy && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <FiUser className="w-4 h-4 text-primary-500" /> <span className="font-medium">{match.foundItem.reportedBy.name}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {match.foundItem.reportedBy.email && (
                  <span className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium">
                    <FiMail className="w-3 h-3" /> {match.foundItem.reportedBy.email}
                  </span>
                )}
                {match.foundItem.reportedBy.phone && (
                  <span className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium">
                    <FiPhone className="w-3 h-3" /> {match.foundItem.reportedBy.phone}
                  </span>
                )}
              </div>
            </div>
          )}

        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => onSelect(match)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all shadow-lg hover:shadow-green-500/20">
            This is my item!
          </button>
          <button onClick={() => onChat(match)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
            <FiMessageCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default function ReportResult() {
  const { t } = useTranslation();
  const { itemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state;

  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState(routeState?.matches || []);
  const [matchMethod, setMatchMethod] = useState(routeState?.matchMethod || '');
  const [loading, setLoading] = useState(true);
  const [noMatchExplanation, setNoMatchExplanation] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

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

  useEffect(() => {
    if (!loading && matches.length === 0 && item && !noMatchExplanation && !explanationLoading) {
      setExplanationLoading(true);
      itemsApi.getNoMatchExplanation(itemId)
        .then((res) => {
          if (res && res.data?.explanation) {
            setNoMatchExplanation(res.data.explanation);
          }
        })
        .catch(() => {})
        .finally(() => setExplanationLoading(false));
    }
  }, [loading, matches, item, itemId, noMatchExplanation, explanationLoading]);


  const handleOpenChat = async (match) => {
    try {
      const res = await matchesApi.getChat(match._id);
      navigate(`/chat/${res.data.chat._id}`);
    } catch { toast.error('Could not open chat'); }
  };

  const handleSelectMatch = (match) => {
    navigate(`/matches/${match._id}`);
  };


  if (loading) return (
    <div className="page-container max-w-3xl text-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 dark:border-primary-400 mx-auto mb-4" />
      <p className="text-gray-500 dark:text-gray-400 text-lg">{t('match.loading')}</p>
      <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('match.loadingDesc')}</p>
    </div>
  );

  return (
    <div className="page-container max-w-4xl">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <FiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Item Reported Successfully!</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{item?.title} &mdash; Lost item</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiPercent className="w-6 h-6 text-primary-500 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Match Results</h2>
        </div>
        {matches.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {matches.length} strong match{matches.length !== 1 ? 'es' : ''} found
          </span>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="card text-center py-12">
          <FiSearch className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('match.noMatchesTitle')}</h3>

          {explanationLoading ? (
            <div className="py-4">
              <div className="w-8 h-8 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">{t('match.aiExplaining')}</p>
            </div>
          ) : noMatchExplanation ? (
            <div className="max-w-lg mx-auto mb-4">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 text-left dark:bg-purple-900/20 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <FiInfo className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-purple-900 dark:text-purple-100 leading-relaxed whitespace-pre-line">{noMatchExplanation}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-2">{t('match.noMatchesDefault')}</p>
          )}

          <p className="text-gray-400 dark:text-gray-500 text-sm">{t('match.noMatchesSubtitle')}</p>
          <div className="flex gap-3 justify-center mt-6">
            <Link to="/matches" className="btn-secondary text-sm flex items-center gap-2">
              <FiRefreshCw className="w-4 h-4" /> {t('match.viewAllMatches')}
            </Link>
            <Link to="/dashboard" className="btn-primary text-sm flex items-center gap-2">
              {t('nav.dashboard')} <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {matches.map((match) => (
            <MatchCard 
              key={match._id} 
              match={match} 
              onChat={handleOpenChat} 
              onSelect={handleSelectMatch}
            />
          ))}
        </div>
      )}

      {/* Manual Selection Section */}
      <div className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <FiTag className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manual Selection (by Category)</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 italic">
          If your item isn't listed above, you can browse all items found in the <strong>{item?.category || 'same'}</strong> category.
        </p>
        
        {/* We would fetch and list items here, but for now we'll provide a direct link */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <FiTag className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-30" />
          <p className="text-gray-600 dark:text-gray-300 mb-6">Want to see everything found in <strong>{item?.category}</strong>?</p>
          <Link to={`/items?type=found&category=${item?.category}`} className="btn-primary">
            Browse All {item?.category} Items
          </Link>
        </div>
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
    parts.push('Our AI compares your item against found items using title, description, category, location, tags, and time proximity. Only matches scoring 70% or higher are shown as strong matches.');
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
  if (q === 'hi' || q === 'hello' || q === 'hey') {
    return "hey i'm lost link system developed by DBE cs student";
  }

  if (parts.length === 0) {
    parts.push("hey i'm lost link system developed by DBE cs student. Ask me about match results, next steps, or item details.");
  }
  return parts.join('\n\n');
}
