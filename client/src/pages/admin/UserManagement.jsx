import { useState, useEffect } from 'react';
import { admin as adminApi } from '../../services/api';
import { FiUsers, FiUserPlus, FiTrash2, FiSlash, FiCheckCircle, FiEye, FiSearch, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSecurity, setNewSecurity] = useState({ name: '', email: '', password: '', phone: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      setUsers(res.data?.users || []);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSecurity = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createUser({ ...newSecurity, role: 'security' });
      toast.success('Security personnel created successfully');
      setShowCreateModal(false);
      setNewSecurity({ name: '', email: '', password: '', phone: '' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create security account');
    }
  };

  const handleAction = async (userId, action) => {
    try {
      if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        await adminApi.deleteUser(userId);
        toast.success('User deleted');
      } else if (action === 'ban' || action === 'unban') {
        await adminApi.updateUserStatus(userId, { status: action === 'ban' ? 'banned' : 'active' });
        toast.success(`User ${action}ned`);
      }
      fetchUsers();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FiUsers className="text-primary-500" /> User Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Oversee system users and manage security personnel</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <FiUserPlus /> Add Security Personnel
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field w-40"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="security">Security</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
            <p className="mt-4 text-gray-500">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs">
                          {u.name[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                        u.role === 'security' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`flex items-center gap-1.5 text-xs ${u.status === 'banned' ? 'text-red-500' : 'text-green-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'banned' ? 'bg-red-500' : 'bg-green-500'}`} />
                        {u.status === 'banned' ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors" title="View Profile">
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleAction(u._id, u.status === 'banned' ? 'unban' : 'ban')}
                          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${u.status === 'banned' ? 'text-green-500' : 'text-orange-500'}`}
                          title={u.status === 'banned' ? 'Unban User' : 'Ban User'}
                        >
                          {u.status === 'banned' ? <FiCheckCircle className="w-4 h-4" /> : <FiSlash className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleAction(u._id, 'delete')}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors" 
                          title="Delete User"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">Add Security Personnel</h3>
            <form onSubmit={handleCreateSecurity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newSecurity.name}
                  onChange={(e) => setNewSecurity({...newSecurity, name: e.target.value})}
                  className="input-field" 
                  placeholder="Officer Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newSecurity.email}
                  onChange={(e) => setNewSecurity({...newSecurity, email: e.target.value})}
                  className="input-field" 
                  placeholder="officer@lostlink.dbu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <input 
                  type="password" 
                  required
                  value={newSecurity.password}
                  onChange={(e) => setNewSecurity({...newSecurity, password: e.target.value})}
                  className="input-field" 
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone Number</label>
                <input 
                  type="tel" 
                  value={newSecurity.phone}
                  onChange={(e) => setNewSecurity({...newSecurity, phone: e.target.value})}
                  className="input-field" 
                  placeholder="+251..."
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
