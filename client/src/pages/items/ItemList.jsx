import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { items as itemsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiSearch, FiMapPin, FiCalendar, FiCpu, FiX, FiPercent } from 'react-icons/fi';

const scoreBars = [
  { key: 'titleScore', label: 'Title', weight: 25 },
  { key: 'descriptionScore', label: 'Description', weight: 25 },
  { key: 'categoryScore', label: 'Category', weight: 20 },
  { key: 'locationScore', label: 'Location', weight: 15 },
  { key: 'tagScore', label: 'Tags', weight: 10 },
  { key: 'timeScore', label: 'Time', weight: 5 },
];

export default function ItemList() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ type: '', category: '' });
  const [aiModal, setAiModal] = useState(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResults, setAiResults] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = { ...filter, q: search || undefined };
    itemsApi.getAll(params)
      .then((res) => setItems(res.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, filter]);

  const runAiMatching = async (item) => {
    setAiRunning(true);
    setAiModal(item._id);
    setAiResults(null);
    try {
      const res = await itemsApi.runAiMatching(item._id);
      setAiResults(res.data);
    } catch (err) {
      setAiResults(null);
      setAiModal(null);
      toast.error(err.message);
    } finally {
      setAiRunning(false);
    }
  };

  const closeModal = () => {
    setAiModal(null);
    setAiResults(null);
  };

  const isOwnItem = (item) => {
    if (!user || !item.reportedBy) return false;
    const id = typeof item.reportedBy === 'object' ? item.reportedBy._id : item.reportedBy;
    return id === user._id;
  };

  const levelColor = (score) => score >= 85 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-gray-400';
  const levelBg = (score) => score >= 85 ? 'bg-green-50 border-green-200' : score >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200';
  const levelLabel = (score) => score >= 85 ? 'Strong Match' : score >= 50 ? 'Moderate Match' : 'Low Match';
  const levelBadge = (score) => score >= 85 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600';

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lost & Found Items</h1>
        <p className="text-gray-500">Browse reported items across campus</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10" placeholder="Search items..." />
        </div>
        <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          className="input-field sm:w-40">
          <option value="">All Types</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="input-field sm:w-40">
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="documents">Documents</option>
          <option value="clothing">Clothing</option>
          <option value="accessories">Accessories</option>
          <option value="books">Books</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading items...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <FiSearch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">No items found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item._id} className="card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
              <Link to={`/items/${item._id}`} className="block">
                <div className="flex items-start justify-between mb-3">
                  <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
                    {item.type}
                  </span>
                  <span className={`badge ${item.status === 'open' ? 'badge-primary' : 'badge-warning'}`}>
                    {item.status}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                <div className="flex items-center text-sm text-gray-500 gap-4">
                  <span className="flex items-center gap-1"><FiMapPin className="w-3.5 h-3.5" /> {item.location}</span>
                  <span className="flex items-center gap-1"><FiCalendar className="w-3.5 h-3.5" /> {new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
              {item.type === 'lost' && isOwnItem(item) && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); runAiMatching(item); }}
                    disabled={aiRunning}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition-all bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiCpu className="w-4 h-4" />
                    AI Matches
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {aiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiCpu className="w-5 h-5 text-purple-600" />
                AI Matching Results
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {aiRunning ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Running AI matching...</p>
                  <p className="text-sm text-gray-400 mt-1">Comparing your item against all found items</p>
                </div>
              ) : aiResults ? (
                <div>
                  {aiResults.matchMethod && (
                    <div className="flex items-center justify-end mb-4">
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                        Method: {aiResults.matchMethod === 'ai' ? 'AI-powered' : aiResults.matchMethod === 'local' ? 'Local algorithm' : 'None'}
                      </span>
                    </div>
                  )}

                  {aiResults.matches && aiResults.matches.length > 0 ? (
                    <div className="space-y-4">
                      {aiResults.matches.map((match) => (
                        <Link key={match._id} to={`/matches/${match._id}`}
                          className={`block border-2 rounded-xl p-4 hover:shadow-md transition-shadow ${levelBg(match.score)}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{match.foundItem?.title || 'Unknown'}</h3>
                              <p className="text-sm text-gray-500 mt-0.5">
                                Found at {match.foundItem?.location || 'Unknown'}
                              </p>
                            </div>
                            <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${levelBadge(match.score)}`}>
                              {levelLabel(match.score)}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            <div className="text-center">
                              <div className={`text-3xl font-bold ${levelColor(match.score)}`}>
                                {Math.round(match.score)}%
                              </div>
                              <p className="text-xs text-gray-500">Match</p>
                            </div>
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div className={`h-3 rounded-full ${match.score >= 85 ? 'bg-green-500' : match.score >= 50 ? 'bg-yellow-500' : 'bg-gray-300'}`}
                                  style={{ width: `${Math.min(match.score, 100)}%` }} />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            {scoreBars.map((sb) => {
                              const val = match.details?.[sb.key] || 0;
                              return (
                                <div key={sb.key} className="bg-white/60 rounded-lg p-2">
                                  <div className="text-gray-500 mb-1">{sb.label}</div>
                                  <div className="flex items-center gap-1">
                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                      <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${val}%` }} />
                                    </div>
                                    <span className="font-medium text-gray-700 w-8 text-right">{val}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-3 flex justify-end">
                            <span className="text-sm text-purple-600 font-medium flex items-center gap-1">
                              View details <FiPercent className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FiCpu className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-700 mb-1">No matches found</h3>
                      <p className="text-gray-500">No matching found items were found for this item yet.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
