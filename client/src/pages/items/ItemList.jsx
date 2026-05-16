import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { items as itemsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FiSearch, FiMapPin, FiCalendar, FiCpu, FiPercent,
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
  if (score >= 85) return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800', label: 'Strong Match', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
  if (score >= 70) return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800', label: 'Good Match', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' };
  return { color: 'text-gray-400 dark:text-gray-500', bg: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700', label: 'Low Match', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
};

export default function ItemList() {
  const { user } = useAuth();
  const [tab, setTab] = useState('search');

  // Search tab state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    location: '',
  });

  // My items state for AI Matches
  const [myItems, setMyItems] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  // Search effect
  useEffect(() => {
    if (tab !== 'search') return;
    setLoading(true);
    itemsApi.getAll({ search, ...filters })
      .then((res) => setItems(res.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tab, search, filters]);

  // AI Matches effect
  useEffect(() => {
    if (tab !== 'matches') return;
    setMyLoading(true);
    itemsApi.getAll()
      .then((res) => setMyItems(res.data?.items || []))
      .catch(() => setMyItems([]))
      .finally(() => setMyLoading(false));
  }, [tab]);

  const allMatches = myItems.flatMap((item) =>
    (item.matches || []).map((m) => ({ ...m, lostItemTitle: item.title, lostItemId: item._id }))
  ).sort((a, b) => b.score - a.score);

  return (
    <div className="page-container max-w-5xl">
      {/* Unified Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Find Item</h1>
        <p className="text-gray-500 dark:text-gray-400">Search for reported items or view your AI-powered matches.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 dark:bg-gray-700/50 p-1.5 rounded-2xl w-fit shadow-inner">
        <button onClick={() => setTab('search')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === 'search' 
              ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <FiSearch className="w-4 h-4" />
          Search Database
        </button>
        <button onClick={() => setTab('matches')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === 'matches' 
              ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <FiCpu className="w-4 h-4" />
          AI Matches
          {allMatches.length > 0 && (
            <span className="ml-1 w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-[10px] rounded-full font-bold">
              {allMatches.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'search' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Search Filters */}
          <div className="card grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/20">
            <div className="md:col-span-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search items..." 
                className="input-field pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="input-field" value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>
              <option value="">All Types</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
            <select className="input-field" value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})}>
              <option value="">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Documents">Documents</option>
              <option value="Wallets">Wallets</option>
              <option value="Keys">Keys</option>
              <option value="Clothing">Clothing</option>
              <option value="Other">Other</option>
            </select>
            <input 
              type="text" 
              placeholder="Location..." 
              className="input-field"
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
              <p className="text-gray-400 animate-pulse font-medium">Scanning Database...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="card text-center py-20 bg-gray-50/50 dark:bg-gray-800/20 border-dashed">
              <FiSearch className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">No items found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div key={item._id} className="group card hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-300 flex flex-col border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-900">
                    {item.images?.[0] ? (
                      <img src={item.images[0].url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-2">
                        <FiSearch className="w-10 h-10 opacity-20" />
                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg ${
                        item.type === 'lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors">{item.title}</h3>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">{item.description}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
                          <FiMapPin className="w-3.5 h-3.5 text-primary-500" />
                          {item.location}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                          <FiCalendar className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Link to={`/items/${item._id}`} className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-primary-600 hover:text-white transition-all group/btn">
                        <FiChevronRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'matches' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {myLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-gray-400 animate-pulse font-medium">Analyzing Matches...</p>
            </div>
          ) : allMatches.length === 0 ? (
            <div className="card text-center py-20 bg-gray-50/50 dark:bg-gray-800/20 border-dashed border-2">
              <FiCpu className="w-16 h-16 mx-auto mb-4 text-purple-200 dark:text-purple-900/40" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">No matches found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Report items to see potential matches here.</p>
              <Link to="/report" className="btn-primary bg-purple-600 hover:bg-purple-700 border-none inline-flex items-center gap-2">
                Report New Item
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {allMatches.map((match) => {
                const level = matchLevel(match.score);
                return (
                  <Link key={match._id} to={`/matches/${match._id}`}
                    className={`group block border-2 rounded-2xl p-5 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 ${level.bg}`}
                  >
                    <div className="flex items-start gap-5">
                      <div className="w-24 h-24 rounded-2xl bg-white dark:bg-gray-900 flex-shrink-0 flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700 relative shadow-sm">
                        <div className={`text-2xl font-black ${level.color}`}>{Math.round(match.score)}%</div>
                        <div className="text-[8px] font-bold uppercase tracking-tighter opacity-50">Match Score</div>
                        <div className={`absolute -bottom-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-md ${level.badge}`}>
                          {level.label}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-purple-600 transition-colors">
                            {match.foundItem?.title || 'Unknown item'}
                          </h3>
                          <FiChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                          Matched with your <span className="font-bold text-gray-700 dark:text-gray-200">"{match.lostItemTitle}"</span>
                        </p>
                        
                        <div className="grid grid-cols-3 gap-2">
                          {scoreBars.slice(0, 3).map((sb) => {
                            const val = match.details?.[sb.key] || 0;
                            return (
                              <div key={sb.key} className="bg-white/50 dark:bg-gray-800/50 p-2 rounded-xl border border-white dark:border-gray-700/50">
                                <p className="text-[8px] text-gray-400 uppercase font-bold tracking-widest mb-1">{sb.label}</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${match.score >= 85 ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${val}%` }} />
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{val}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
