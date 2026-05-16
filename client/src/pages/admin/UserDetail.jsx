import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { admin as adminApi } from '../../services/api';
import { 
  FiUser, FiMail, FiPhone, FiBook, FiHash, 
  FiShield, FiCalendar, FiMapPin, FiClock,
  FiTrash2, FiSlash, FiCheckCircle, FiArrowLeft,
  FiPackage, FiFileText, FiActivity
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchUserData();
  }, [id]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const [userRes, itemsRes] = await Promise.all([
        adminApi.getUser(id),
        adminApi.getUserItems(id)
      ]);
      setUser(userRes.data?.user);
      setItems(itemsRes.data?.items || []);
    } catch (error) {
      toast.error('Failed to load user details');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    try {
      if (action === 'delete') {
        if (!window.confirm('Are you sure you want to deactivate this account?')) return;
        await adminApi.deleteUser(id);
        toast.success('Account deactivated');
        navigate('/admin/users');
      } else if (action === 'ban' || action === 'unban') {
        await adminApi.updateUserStatus(id, { status: action === 'ban' ? 'banned' : 'active' });
        toast.success(`User ${action === 'ban' ? 'banned' : 'reactivated'}`);
        fetchUserData();
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleRoleChange = async (newRole) => {
    try {
      await adminApi.updateUserRole(id, { role: newRole });
      toast.success('Role updated successfully');
      fetchUserData();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="page-container py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors mb-6 group">
        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Users
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sidebar: Profile Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card text-center p-8">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 text-3xl font-black">
                {user.name[0].toUpperCase()}
              </div>
              <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white dark:border-gray-800 ${user.status === 'banned' ? 'bg-red-500' : 'bg-green-500'}`} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user.name}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{user.email}</p>
            
            <div className="flex flex-wrap justify-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {user.role}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                user.status === 'banned' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}>
                {user.status}
              </span>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Admin Actions</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Change Role</label>
                <select 
                  value={user.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="input-field py-2 text-sm"
                >
                  <option value="user">Student / User</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                {user.status === 'banned' ? (
                  <button onClick={() => handleAction('unban')} className="w-full btn-secondary text-green-600 border-green-100 hover:bg-green-50 flex items-center justify-center gap-2">
                    <FiCheckCircle /> Reactivate Account
                  </button>
                ) : (
                  <button onClick={() => handleAction('ban')} className="w-full btn-secondary text-orange-600 border-orange-100 hover:bg-orange-50 flex items-center justify-center gap-2">
                    <FiSlash /> Suspend Account
                  </button>
                )}
                <button onClick={() => handleAction('delete')} className="w-full py-2.5 rounded-xl font-bold text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                  <FiTrash2 /> Deactivate Permanently
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: Tabs & Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="flex border-b border-gray-100 dark:border-gray-700">
              {['profile', 'items', 'activity'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
                    activeTab === tab ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-500" />}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeTab === 'profile' && (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <FiUser className="text-primary-500" /> Basic Information
                    </h4>
                    <div className="space-y-4">
                      <InfoItem icon={FiHash} label="Student ID" value={user.studentId || 'Not provided'} />
                      <InfoItem icon={FiBook} label="Department" value={user.department || 'Not provided'} />
                      <InfoItem icon={FiPhone} label="Phone Number" value={user.phone || 'Not provided'} />
                      <InfoItem icon={FiCalendar} label="Joined On" value={new Date(user.createdAt).toLocaleDateString()} />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <FiShield className="text-primary-500" /> Security & Stats
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <StatCard icon={FiPackage} label="Reported" value={items.length} color="blue" />
                      <StatCard icon={FiCheckCircle} label="Resolved" value={items.filter(i => i.status === 'resolved').length} color="green" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'items' && (
                <div className="space-y-4">
                  {items.length > 0 ? (
                    items.map(item => (
                      <div key={item._id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            item.type === 'lost' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            <FiPackage className="w-6 h-6" />
                          </div>
                          <div>
                            <h5 className="font-bold text-gray-900 dark:text-gray-100">{item.title}</h5>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="uppercase font-bold">{item.type}</span>
                              <span>•</span>
                              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'open' ? 'bg-blue-100 text-blue-700' :
                          item.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No items reported by this user.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="text-center py-12">
                  <FiActivity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Detailed audit logs for this user will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{label}</p>
        <p className="font-medium text-gray-700 dark:text-gray-300">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  };
  return (
    <div className={`p-4 rounded-2xl ${colors[color]} border border-white/10`}>
      <Icon className="w-5 h-5 mb-2" />
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
    </div>
  );
}
