import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { items as itemsApi, claims as claimsApi, matches as matchesApi } from '../../services/api';
import { FiPlus, FiSearch, FiClock, FiCheckCircle, FiPercent, FiMessageCircle } from 'react-icons/fi';

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ myItems: 0, myClaims: 0, resolved: 0, matches: 0, strongMatches: 0 });
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      itemsApi.getAll({ limit: 5, type: 'lost' }),
      claimsApi.getAll({ limit: 5 }),
      matchesApi.getAll(),
    ]).then(([itemsRes, claimsRes, matchRes]) => {
      setRecentItems(itemsRes.data?.items || []);
      const matches = matchRes.data?.matches || [];
      setStats({
        myItems: itemsRes.data?.items?.length || 0,
        myClaims: claimsRes.data?.claims?.length || 0,
        resolved: claimsRes.data?.claims?.filter(c => c.status === 'completed' || c.status === 'approved').length || 0,
        matches: matches.length,
        strongMatches: matches.filter(m => m.isStrongMatch).length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {user?.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here's your lost & found activity overview.</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Link to="/report" className="btn-primary flex items-center gap-2">
            <FiPlus /> Report Item
          </Link>
          <Link to="/items" className="btn-secondary flex items-center gap-2">
            <FiSearch /> Search
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'My Reports', value: stats.myItems, icon: FiPlus, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400', link: '/items' },
          { label: 'Active Claims', value: stats.myClaims, icon: FiClock, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400', link: '#' },
          { label: 'Resolved', value: stats.resolved, icon: FiCheckCircle, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400', link: '#' },
          { label: 'AI Matches', value: stats.matches, icon: FiPercent, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400', link: '/matches' },
          { label: 'Strong Matches', value: stats.strongMatches, icon: FiMessageCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400', link: '/matches' },
        ].map((s) => (
          <Link key={s.label} to={s.link} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Lost Items Board</h2>
          <Link to="/items" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">View All</Link>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : recentItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FiSearch className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>No items yet. Be the first to report!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentItems.map((item) => (
              <Link key={item._id} to={`/items/${item._id}`}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.location} &middot; {new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`badge ${item.status === 'open' ? 'badge-primary' : item.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>
                  {item.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
