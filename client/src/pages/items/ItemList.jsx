import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { items as itemsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiSearch, FiMapPin, FiCalendar, FiCpu, FiX, FiPercent,
  FiShield, FiUser, FiChevronRight,
} from 'react-icons/fi';

const scoreBars = [
  { key: 'titleScore', label: 'Title', weight: 25 },
  { key: 'descriptionScore', label: 'Description', weight: 25 },
  { key: 'categoryScore', label: 'Category', weight: 20 },
  { key: 'locationScore', label: 'Location', weight: 15 },
  { key: 'tagScore', label: 'Tags', weight: 10 },
  { key: 'timeScore', label: 'Time', weight: 5 },
];

const matchLevel = (score) => {
  if (score >= 85) return { color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Strong Match', badge: 'bg-green-100 text-green-700' };
  if (score >= 70) return { color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Good Match', badge: 'bg-yellow-100 text-yellow-700' };
  return { color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', label: 'Low Match', badge: 'bg-gray-100 text-gray-600' };
};

const tabs = [
  { key: 'search', label: 'Search Items', icon: FiSearch },
  { key: 'my', label: 'My Items', icon: FiShield },
];

export default function ItemList() {
  const { user } = useAuth();
  const [tab, setTab] = useState('search');

  // Search tab state
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');

  // My Items tab state
  const [myItems, setMyItems] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  // AI Match modal state
  const [aiModal, setAiModal] = useState(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResults, setAiResults] = useState(null);

  // Search effect
  useEffect(() => {
    if (tab !== 'search') return;
    setSearchLoading(true);
    const params = {};
    if (searchQuery) params.q = searchQuery;
    if (searchCategory) params.category = searchCategory;
    itemsApi.search(params)
      .then((res) => setSearchResults(res.data?.items || []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [tab, searchQuery, searchCategory]);

  // My Items effect
  useEffect(() => {
    if (tab !== 'my') return;
    setMyLoading(true);
    itemsApi.getAll()
      .then((res) => setMyItems(res.data?.items || []))
      .catch(() => setMyItems([]))
      .finally(() => setMyLoading(false));
  }, [tab]);

  // AI Match
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

  const myLost = myItems.filter((i) => i.type === 'lost');
  const myFound = myItems.filter((i) => i.type === 'found');

  const allMatches = myLost.flatMap((item) =>
    (item.matches || []).map((m) => ({ ...m, lostItemTitle: item.title, lostItemId: item._id }))
  ).sort((a, b) => b.score - a.score);

  return (
    <div className="page-container max-w-5xl">
      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'search' && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Search Lost Items</h1>
          <p className="text-gray-500 mb-6">Browse lost items reported by other users across campus.</p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10" placeholder="Search items..." />
            </div>
            <select value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="input-field sm:w-44">
              <option value="">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="documents">Documents</option>
              <option value="clothing">Clothing</option>
              <option value="accessories">Accessories</option>
              <option value="books">Books</option>
              <option value="other">Other</option>
            </select>
          </div>

          {searchLoading ? (
            <div className="text-center py-16 text-gray-500">Searching...</div>
          ) : searchResults.length === 0 ? (
            <div className="card text-center py-16">
              <FiSearch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">No items found</h3>
              <p className="text-gray-500">Try a different search term or category.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((item) => (
                <Link key={item._id} to={`/items/${item._id}`}
                  className="card hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="badge badge-danger">lost</span>
                    <span className={`badge ${item.status === 'open' ? 'badge-primary' : 'badge-warning'}`}>
                      {item.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                  <div className="flex items-center text-sm text-gray-500 gap-4 mb-2">
                    <span className="flex items-center gap-1"><FiMapPin className="w-3.5 h-3.5" /> {item.location}</span>
                    <span className="flex items-center gap-1"><FiCalendar className="w-3.5 h-3.5" /> {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  {item.reportedBy && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 pt-2 border-t border-gray-100">
                      <FiUser className="w-3 h-3" />
                      Reported by {item.reportedBy.name || 'Anonymous'} &middot; {item.reportedBy.department || ''}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'my' && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">My Items</h1>
            <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              <FiShield className="w-3 h-3" /> Private
            </span>
          </div>
          <p className="text-gray-500 mb-6">Your reported items. Use AI Match to find potential matches.</p>

          {myLoading ? (
            <div className="text-center py-16 text-gray-500">Loading...</div>
          ) : myItems.length === 0 ? (
            <div className="card text-center py-16">
              <FiShield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">No items yet</h3>
              <p className="text-gray-500 mb-4">Report a lost or found item to get started.</p>
              <Link to="/report" className="btn-primary inline-flex items-center gap-2">Report Item</Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pre-computed match summary */}
              {allMatches.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <FiCpu className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-bold text-gray-900">AI Match Results</h2>
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                      {allMatches.length} match{allMatches.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {allMatches.map((match) => {
                      const level = matchLevel(match.score);
                      return (
                        <Link key={match._id} to={`/matches/${match._id}`}
                          className={`block border-2 rounded-xl p-4 hover:shadow-md transition-all ${level.bg}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {match.foundItem?.title || 'Unknown item'}
                                </h3>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${level.badge}`}>
                                  {level.label}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                Matched your <strong>{match.lostItemTitle}</strong>
                                {' '}&middot; Found at {match.foundItem?.location || 'Unknown'}
                              </p>
                              <div className="flex items-center gap-4 mt-3">
                                <div className={`text-2xl font-bold ${level.color}`}>{Math.round(match.score)}%</div>
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div className={`h-2 rounded-full ${match.score >= 85 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                    style={{ width: `${Math.min(match.score, 100)}%` }} />
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {scoreBars.slice(0, 3).map((sb) => {
                                  const val = match.details?.[sb.key] || 0;
                                  return (
                                    <span key={sb.key} className="text-xs bg-white/70 rounded-md px-2 py-1 text-gray-600">
                                      {sb.label}: <strong>{val}%</strong>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                            <FiChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Lost items */}
              {myLost.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    My Lost Items
                    <span className="text-sm font-normal text-gray-400 ml-2">({myLost.length})</span>
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {myLost.map((item) => (
                      <div key={item._id} className="card flex flex-col">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <span className="badge badge-danger">lost</span>
                            <span className={`badge ${item.status === 'open' ? 'badge-primary' : 'badge-warning'}`}>
                              {item.status}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{item.title}</h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                          <div className="flex items-center text-sm text-gray-500 gap-4 mb-3">
                            <span className="flex items-center gap-1"><FiMapPin className="w-3.5 h-3.5" /> {item.location}</span>
                            <span className="flex items-center gap-1"><FiCalendar className="w-3.5 h-3.5" /> {new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-gray-100 space-y-2">
                          <button onClick={() => runAiMatching(item)}
                            disabled={aiRunning && aiModal === item._id}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            <FiCpu className="w-4 h-4" />
                            {aiRunning && aiModal === item._id ? 'Matching...' : 'AI Match'}
                          </button>
                          {item.matches && item.matches.length > 0 && (
                            <Link to={`/matches/${item.matches[0]._id}`}
                              className="flex items-center justify-between text-xs text-purple-600 hover:text-purple-800 font-medium px-1"
                            >
                              <span className="flex items-center gap-1">
                                <FiPercent className="w-3 h-3" />
                                {item.matches.length} existing match{item.matches.length !== 1 ? 'es' : ''}
                              </span>
                              <span>Best: {Math.round(item.matches[0].score)}%</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Found items */}
              {myFound.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    My Found Reports
                    <span className="text-sm font-normal text-gray-400 ml-2">({myFound.length})</span>
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {myFound.map((item) => (
                      <div key={item._id} className="card">
                        <div className="flex items-start justify-between mb-3">
                          <span className="badge badge-success">found</span>
                          <span className={`badge ${item.status === 'open' ? 'badge-primary' : 'badge-warning'}`}>
                            {item.status}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                        <div className="flex items-center text-sm text-gray-500 gap-4">
                          <span className="flex items-center gap-1"><FiMapPin className="w-3.5 h-3.5" /> {item.location}</span>
                          <span className="flex items-center gap-1"><FiCalendar className="w-3.5 h-3.5" /> {new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* AI Match Results Modal */}
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
                        <div className="flex justify-end mb-4">
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                            Method: {aiResults.matchMethod === 'ai' ? 'AI-powered' : aiResults.matchMethod === 'local' ? 'Local algorithm' : 'None'}
                          </span>
                        </div>
                      )}
                      {aiResults.matches && aiResults.matches.length > 0 ? (
                        <div className="space-y-4">
                          {aiResults.matches.map((match) => {
                            const level = matchLevel(match.score);
                            return (
                              <Link key={match._id} to={`/matches/${match._id}`}
                                className={`block border-2 rounded-xl p-4 hover:shadow-md transition-shadow ${level.bg}`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{match.foundItem?.title || 'Unknown'}</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                      Found at {match.foundItem?.location || 'Unknown'}
                                    </p>
                                  </div>
                                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${level.badge}`}>
                                    {level.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 mb-3">
                                  <div className={`text-3xl font-bold ${level.color}`}>
                                    {Math.round(match.score)}%
                                  </div>
                                  <div className="flex-1">
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                      <div className={`h-3 rounded-full ${match.score >= 85 ? 'bg-green-500' : 'bg-yellow-500'}`}
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
                              </Link>
                            );
                          })}
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
      )}
    </div>
  );
}
