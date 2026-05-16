import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matches as matchesApi } from '../../services/api';
import { FiPercent, FiMessageCircle, FiCheckCircle, FiXCircle, FiClock, FiArrowRight } from 'react-icons/fi';

const statusConfig = {
  pending: { label: 'Pending', class: 'badge-warning', icon: FiClock },
  contacted: { label: 'Contacted', class: 'badge-primary', icon: FiMessageCircle },
  resolved: { label: 'Resolved', class: 'badge-success', icon: FiCheckCircle },
  dismissed: { label: 'Dismissed', class: 'badge-danger', icon: FiXCircle },
};

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matchesApi.getAll()
      .then((res) => setMatches(res.data.matches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Item Matches</h1>
          <p className="text-gray-500 mt-1">Potential matches for your lost items, ranked by similarity.</p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="card text-center py-16">
          <FiPercent className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">No matches found yet.</p>
          <p className="text-gray-400 text-sm mt-1">When someone reports a found item matching yours, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
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
                        {match.isStrongMatch ? 'Strong Match' : 'Potential Match'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      Matched with <strong>{match.foundItem?.title || 'Unknown'}</strong>
                      {' '}&middot; Found at {match.foundItem?.location || 'Unknown'}
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
