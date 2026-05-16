import { useState, useEffect } from 'react';
import { admin as adminApi } from '../../services/api';
import { FiUsers, FiEye, FiMapPin, FiClock, FiCheckCircle, FiInfo, FiUser, FiBox, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function LostFoundUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userItems, setUserItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    fetchLostFoundUsers();
  }, []);

  const fetchLostFoundUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getLostFoundUsers();
      setUsers(res.data?.users || []);
    } catch (error) {
      toast.error('Failed to load lost/found users');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (user) => {
    setSelectedUser(user);
    setItemsLoading(true);
    try {
      const res = await adminApi.getUserItems(user._id);
      setUserItems(res.data?.items || []);
    } catch (error) {
      toast.error('Failed to load user items');
    } finally {
      setItemsLoading(false);
    }
  };

  if (selectedUser) {
    return (
      <div className="page-container">
        <button 
          onClick={() => setSelectedUser(null)}
          className="mb-6 flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors"
        >
          <FiArrowLeft /> Back to List
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <div className="card text-center">
              <div className="relative inline-block mb-4">
                {selectedUser.avatar ? (
                  <img 
                    src={selectedUser.avatar} 
                    alt={selectedUser.name} 
                    className="w-32 h-32 rounded-full object-cover border-4 border-primary-500/10 shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 text-4xl font-bold border-4 border-primary-500/10 shadow-xl">
                    {selectedUser.name[0].toUpperCase()}
                  </div>
                )}
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white dark:border-gray-800 rounded-full" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedUser.name}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{selectedUser.email}</p>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">{selectedUser.counts?.lost || 0}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Lost Items</p>
                </div>
                <div className="text-center border-l border-gray-100 dark:border-gray-700">
                  <p className="text-2xl font-bold text-green-600">{selectedUser.counts?.found || 0}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Found Items</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Items List */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FiBox className="text-primary-500" /> Item History & Status
            </h3>
            
            {itemsLoading ? (
              <div className="card py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            ) : userItems.length === 0 ? (
              <div className="card py-12 text-center text-gray-500">
                No items reported by this user.
              </div>
            ) : (
              userItems.map((item) => (
                <div key={item._id} className="card group hover:border-primary-500/30 transition-all duration-300">
                  <div className="flex flex-col md:flex-row gap-6">
                    {item.images?.[0] && (
                      <img 
                        src={item.images[0]} 
                        className="w-full md:w-32 h-32 rounded-xl object-cover shadow-sm group-hover:shadow-md transition-shadow"
                        alt={item.title}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${item.type === 'lost' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {item.type}
                          </span>
                          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{item.title}</h4>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          item.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          item.status === 'matched' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <FiMapPin className="text-primary-400" />
                          {item.location}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <FiClock className="text-primary-400" />
                          {new Date(item.date).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2 italic">
                          "{item.description}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <FiUsers className="text-primary-500" /> Lost & Found Users
        </h1>
        <p className="text-gray-500 dark:text-gray-400">View user profiles and their reported items</p>
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
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4 text-center">Lost Items</th>
                  <th className="px-6 py-4 text-center">Found Items</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs overflow-hidden">
                          {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : u.name[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                        {u.counts?.lost || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold">
                        {u.counts?.found || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => handleViewProfile(u)}
                        className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 ml-auto"
                      >
                        <FiEye className="w-3 h-3" /> View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
