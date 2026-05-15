import { useState, useEffect } from 'react';
import { admin as adminApi } from '../../services/api';
import { FiUsers, FiClipboard, FiShield, FiActivity } from 'react-icons/fi';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getUsers({ limit: 10 }),
    ]).then(([statsRes, usersRes]) => {
      setStats(statsRes.data?.stats);
      setUsers(usersRes.data?.users || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container text-center py-12 text-gray-500">Loading dashboard...</div>;

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-8">
        <FiShield className="w-8 h-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">System overview and user management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Users', value: stats?.totalUsers || 0, icon: FiUsers, color: 'text-blue-600 bg-blue-100' },
          { label: 'Total Items', value: stats?.totalItems || 0, icon: FiClipboard, color: 'text-purple-600 bg-purple-100' },
          { label: 'Total Claims', value: stats?.totalClaims || 0, icon: FiActivity, color: 'text-orange-600 bg-orange-100' },
          { label: 'Active Items', value: stats?.itemsByType?.find(i => i._id === 'lost')?.count || 0, icon: FiShield, color: 'text-green-600 bg-green-100' },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Users</h2>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <span className={`badge ${user.role === 'admin' ? 'badge-danger' : user.role === 'security' ? 'badge-warning' : 'badge-primary'}`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Claims by Status</h2>
          {stats?.claimsByStatus?.map((c) => (
            <div key={c._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <span className="text-gray-700 capitalize">{c._id}</span>
              <span className="font-semibold text-gray-900">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
