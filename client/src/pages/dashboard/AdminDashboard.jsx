import { useState, useEffect } from 'react';
import { admin as adminApi, security as securityApi } from '../../services/api';
import { FiUsers, FiClipboard, FiShield, FiActivity, FiEdit2, FiDownload, FiTrash2, FiUser, FiCpu } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const toCsv = (headers, rows) => {
  const csvRows = [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(','))];
  return csvRows.join('\n');
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRole, setEditingRole] = useState('user');
  // const [activeTab, setActiveTab] = useState('overview');
  const [lostFoundUsers, setLostFoundUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, reportsRes, usersRes, devicesRes, lostFoundUsersRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.getReports(),
          adminApi.getUsers({ limit: 50 }),
          securityApi.getDevices({ limit: 50 }),
          adminApi.getLostFoundUsers({ limit: 50 }),
        ]);

        setStats(statsRes.data?.stats || {});
        setReports(reportsRes.data?.reports || {});
        setUsers(usersRes.data?.users || []);
        setDevices(devicesRes.data?.devices || []);
        setLostFoundUsers(lostFoundUsersRes.data?.users || []);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleExportUsers = () => {
    const headers = ['Name', 'Email', 'Role', 'Department', 'Created At'];
    const rows = users.map((user) => [user.name, user.email, user.role, user.department || 'N/A', new Date(user.createdAt).toLocaleString()]);
    const csv = toCsv(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'users-export.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleEditRole = (userId, currentRole) => {
    setEditingUserId(userId);
    setEditingRole(currentRole);
  };

  const handleSaveRole = async (userId) => {
    try {
      await adminApi.updateUserRole(userId, { role: editingRole });
      setUsers((prev) => prev.map((user) => (user._id === userId ? { ...user, role: editingRole } : user)));
      toast.success('User role updated successfully.');
      setEditingUserId(null);
    } catch (error) {
      toast.error(error.message || 'Failed to update user role.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await adminApi.deleteUser(userId);
        setUsers((prev) => prev.filter((user) => user._id !== userId));
        toast.success('User deleted successfully.');
      } catch (error) {
        toast.error(error.message || 'Failed to delete user.');
      }
    }
  };

  const renderOverview = () => {
    const chartData = [
      { name: 'Users', value: stats?.totalUsers || 0, color: '#3DBBD2' }, // Sky Blue
      { name: 'Items', value: stats?.totalItems || 0, color: '#FCDD4F' }, // Gold
      { name: 'Claims', value: stats?.totalClaims || 0, color: '#E52D2D' }, // Red
      { name: 'Devices', value: devices.length || 0, color: '#287F40' }, // Green
    ];

    const COLORS = ['#3DBBD2', '#FCDD4F', '#E52D2D', '#287F40'];

    return (
      <div className="space-y-8">
        {/* Key Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Users', value: stats?.totalUsers || 0, icon: FiUsers, color: 'text-dbu-blue bg-dbu-blue/10 dark:text-dbu-blue' },
            { label: 'Total Items', value: stats?.totalItems || 0, icon: FiClipboard, color: 'text-dbu-gold bg-dbu-gold/10 dark:text-dbu-gold' },
            { label: 'Total Claims', value: stats?.totalClaims || 0, icon: FiActivity, color: 'text-dbu-red bg-dbu-red/10 dark:text-dbu-red' },
            { label: 'Registered Devices', value: devices.length || 0, icon: FiShield, color: 'text-dbu-green bg-dbu-green/10 dark:text-dbu-green' },
          ].map((s) => (
            <div key={s.label} className="card transform hover:scale-[1.02] transition-transform duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color} shadow-sm`}>
                  <s.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Visualizations Section */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="card min-h-[450px]">
            <h2 className="text-xl font-bold mb-8 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FiActivity className="text-primary-500" /> Platform Metrics Comparison
            </h2>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card min-h-[450px]">
            <h2 className="text-xl font-bold mb-8 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FiCpu className="text-primary-500" /> Data Distribution
            </h2>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FiActivity className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Overview</h1>
            <p className="text-gray-500 dark:text-gray-400">Real-time platform performance and statistics</p>
          </div>
        </div>
      </div>

      {renderOverview()}
    </div>
  );
}