import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { matches as matchesApi, items as itemsApi } from '../../services/api';
import { FiPercent, FiMessageCircle, FiCheckCircle, FiXCircle, FiClock, FiArrowRight, FiCpu, FiInfo } from 'react-icons/fi';

const statusConfig = {
  pending: { label: 'Pending', class: 'badge-warning', icon: FiClock },
  contacted: { label: 'Contacted', class: 'badge-primary', icon: FiMessageCircle },
  resolved: { label: 'Resolved', class: 'badge-success', icon: FiCheckCircle },
  dismissed: { label: 'Dismissed', class: 'badge-danger', icon: FiXCircle },
};

export default function Matches() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [noMatchExplanation, setNoMatchExplanation] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const runId = searchParams.get('runAiMatch');

    if (runId) {
      setMatching(true);
      itemsApi.runAiMatching(runId)
        .then((res) => {
          setAiResults(res.data);
          return matchesApi.getAll();
        })
        .then((res) => setMatches(res.data.matches || []))
        .catch(() => {})
        .finally(() => {
          setMatching(false);
          setLoading(false);
        });
    } else {
      setAiResults(null);
      matchesApi.getAll()
        .then((res) => setMatches(res.data.matches || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading || matching) return;
    if (noMatchExplanation) return;

    const display = (aiResults?.matches && aiResults.matches.length > 0)
      ? aiResults.matches
      : matches;

    if (display.length > 0) return;

    setExplanationLoading(true);
    itemsApi.getAll({ type: 'lost', limit: 1 })
      .then((res) => {
        const items = res.data?.items || [];
        if (items.length > 0) {
          return itemsApi.getNoMatchExplanation(items[0]._id);
        }
        return null;
      })
      .then((res) => {
        if (res && res.data?.explanation) {
          setNoMatchExplanation(res.data.explanation);
        }
      })
      .catch(() => {})
      .finally(() => setExplanationLoading(false));
  }, [loading, matching, aiResults, matches, noMatchExplanation]);

  const displayMatches = (aiResults?.matches && aiResults.matches.length > 0)
    ? aiResults.matches
    : matches;

  if (matching) return (
    <div className="page-container text-center py-16">
      <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600 font-medium">{t('match.loading')}</p>
      <p className="text-sm text-gray-400 mt-1">{t('match.loadingDesc')}</p>
    </div>
  );

  if (loading) return <div className="page-container text-center py-16 text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('match.title')}</h1>
          <p className="text-gray-500 mt-1">{t('match.subtitle')}</p>
        </div>
        {aiResults?.matchMethod && (
          <span className="text-xs text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">
            Method: {aiResults.matchMethod === 'ai' ? t('match.methodAi') : aiResults.matchMethod === 'local' ? t('match.methodLocal') : t('match.methodNone')}
          </span>
        )}
      </div>

      {displayMatches.length === 0 ? (
        <div className="card text-center py-12">
          <FiCpu className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('match.noMatchesTitle')}</h3>

          {explanationLoading ? (
            <div className="py-6">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t('match.aiExplaining')}</p>
            </div>
          ) : noMatchExplanation ? (
            <div className="max-w-lg mx-auto">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-5 text-left">
                <div className="flex items-start gap-3">
                  <FiInfo className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-purple-900 leading-relaxed whitespace-pre-line">{noMatchExplanation}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-4">{t('match.noMatchesSubtitle')}</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-500">{t('match.noMatchesDefault')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('match.noMatchesSubtitle')}</p>
            </div>
          )}

          <div className="flex gap-3 justify-center mt-6">
            <Link to="/dashboard" className="btn-primary text-sm flex items-center gap-2">
              {t('nav.dashboard')} <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayMatches.map((match) => {
            const StatusIcon = statusConfig[match.status]?.icon || FiClock;
            return (
              <Link key={match._id} to={`/matches/${match._id}`}
                className="card block hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {match.lostItem?.title || 'Unknown Item'}
                      </h3>
                      <span className={`badge ${match.isStrongMatch ? 'badge-danger' : 'badge-primary'}`}>
                        {match.isStrongMatch ? t('match.strongMatch') : t('match.potentialMatch')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      {t('match.matchedWith')} <strong>{match.foundItem?.title || 'Unknown'}</strong>
                      {' '}&middot; {t('match.foundAt')} {match.foundItem?.location || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-gray-500">
                        <StatusIcon className="w-4 h-4" />
                        {statusConfig[match.status]?.label || match.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-6 flex flex-col items-end gap-2">
                    <div className={`text-3xl font-bold ${match.score >= 85 ? 'text-green-600' : match.score >= 50 ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {Math.round(match.score)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${match.score >= 85 ? 'bg-green-500' : match.score >= 50 ? 'bg-yellow-500' : 'bg-gray-300'}`}
                        style={{ width: `${Math.min(match.score, 100)}%` }} />
                    </div>
                    <FiArrowRight className="w-5 h-5 text-gray-400 mt-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
