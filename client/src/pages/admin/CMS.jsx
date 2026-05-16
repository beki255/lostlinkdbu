import { useState, useEffect } from 'react';
import { admin as adminApi } from '../../services/api';
import { FiLayout, FiBell, FiEdit3, FiSave, FiTrash2, FiPlusCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CMS() {
  const [pages, setPages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pages');
  const [newAnnouncement, setNewAnnouncement] = useState({ message: '', type: 'info' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pagesRes, annRes] = await Promise.all([
        adminApi.getCmsPages(),
        adminApi.getAnnouncements()
      ]);
      setPages(pagesRes.data?.pages || []);
      setAnnouncements(annRes.data?.announcements || []);
    } catch (error) {
      toast.error('Failed to load CMS data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePage = async (pageId, content) => {
    try {
      await adminApi.updateCmsPage(pageId, { content });
      toast.success('Page updated successfully');
      fetchData();
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createAnnouncement(newAnnouncement);
      toast.success('Announcement published');
      setNewAnnouncement({ message: '', type: 'info' });
      fetchData();
    } catch (error) {
      toast.error('Failed to publish');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await adminApi.deleteAnnouncement(id);
      toast.success('Announcement removed');
      fetchData();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <FiLayout className="text-primary-500" /> CMS Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Update system content and broadcast announcements</p>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('pages')}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${activeTab === 'pages' ? 'bg-primary-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
        >
          System Pages
        </button>
        <button 
          onClick={() => setActiveTab('announcements')}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${activeTab === 'announcements' ? 'bg-primary-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
        >
          Announcements
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
        </div>
      ) : activeTab === 'pages' ? (
        <div className="grid gap-6">
          {pages.map((page) => (
            <div key={page._id} className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize">{page.title.replace(/-/g, ' ')}</h3>
                <FiEdit3 className="text-gray-400" />
              </div>
              <textarea 
                className="input-field min-h-[150px] font-mono text-sm mb-4"
                defaultValue={JSON.stringify(page.content, null, 2)}
                id={`page-${page._id}`}
              />
              <button 
                onClick={() => {
                  const el = document.getElementById(`page-${page._id}`);
                  try {
                    const content = JSON.parse(el.value);
                    handleUpdatePage(page._id, content);
                  } catch (e) {
                    toast.error('Invalid JSON content');
                  }
                }}
                className="btn-primary flex items-center gap-2 px-6"
              >
                <FiSave /> Save Changes
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-4">New Announcement</h3>
            <form onSubmit={handleAddAnnouncement} className="space-y-4">
              <textarea 
                required
                className="input-field" 
                placeholder="Broadcast message to all users..."
                value={newAnnouncement.message}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
              />
              <div className="flex gap-4">
                <select 
                  className="input-field w-40"
                  value={newAnnouncement.type}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Yellow)</option>
                  <option value="danger">Urgent (Red)</option>
                  <option value="success">Success (Green)</option>
                </select>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <FiPlusCircle /> Broadcast Now
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FiBell className="text-primary-500" /> Active Broadcasts
            </h3>
            {announcements.length === 0 ? (
              <p className="text-gray-500 text-center py-8 card">No active announcements</p>
            ) : announcements.map((ann) => (
              <div key={ann._id} className="card flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-10 rounded-full ${
                    ann.type === 'danger' ? 'bg-red-500' : 
                    ann.type === 'warning' ? 'bg-yellow-500' : 
                    ann.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className="text-gray-900 dark:text-gray-100">{ann.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(ann.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteAnnouncement(ann._id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
