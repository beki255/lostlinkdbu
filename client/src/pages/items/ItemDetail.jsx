import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { items as itemsApi, claims as claimsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiMapPin, FiCalendar, FiUser, FiArrowLeft, FiSend, FiLink, FiXCircle } from 'react-icons/fi';

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [claimDesc, setClaimDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userLostItems, setUserLostItems] = useState([]);
  const [selectedLostId, setSelectedLostId] = useState('');
  const [manualMatching, setManualMatching] = useState(false);

  useEffect(() => {
    itemsApi.getById(id)
      .then((res) => setItem(res.data.item))
      .catch(() => toast.error('Item not found'))
      .finally(() => setLoading(false));
    
    if (user) {
      itemsApi.getAll({ reportedBy: user._id, type: 'lost', status: 'open' })
        .then(res => setUserLostItems(res.data.items || []))
        .catch(err => console.error('Failed to load your lost items', err));
    }
  }, [id, user]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    setDeleting(true);
    try {
      await itemsApi.delete(id);
      toast.success('Item deleted successfully');
      navigate('/items');
    } catch (err) {
      toast.error(err.message || 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  const handleClaim = async () => {
    if (!claimDesc.trim()) return;
    setSubmitting(true);
    try {
      await claimsApi.submit({ itemId: id, description: claimDesc });
      toast.success('Claim submitted! A security officer will review it.');
      setClaimDesc('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedLostId) return;
    setManualMatching(true);
    try {
      await matchesApi.createManualMatch({
        lostItemId: selectedLostId,
        foundItemId: id,
        explanation: 'Manually matched by the owner.'
      });
      toast.success('Manual match created! You can now chat with the finder.');
      // Optionally redirect to the match page
    } catch (err) {
      toast.error(err.message);
    } finally {
      setManualMatching(false);
    }
  };

  if (loading) return <div className="page-container text-center py-16 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!item) return <div className="page-container text-center py-16 text-gray-500 dark:text-gray-400">Item not found.</div>;

  return (
    <div className="page-container max-w-3xl">
      <Link to="/items" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <FiArrowLeft className="w-4 h-4 mr-1" /> Back to items
      </Link>

      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Reported by {item.reportedBy?.name || 'Anonymous'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>{item.type}</span>
              <span className={`badge ${item.status === 'open' ? 'badge-primary' : item.status === 'claimed' ? 'badge-warning' : 'badge-success'}`}>{item.status}</span>
            </div>
            {user?._id === item.reportedBy?._id && item.status !== 'resolved' && (
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 mt-1 transition-colors"
              >
                <FiXCircle className="w-3 h-3" /> {deleting ? 'Deleting...' : 'Delete Report'}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <span className="flex items-center gap-1"><FiMapPin className="w-4 h-4" /> {item.location}</span>
          <span className="flex items-center gap-1"><FiCalendar className="w-4 h-4" /> {new Date(item.createdAt).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><FiUser className="w-4 h-4" /> {item.category}</span>
        </div>

        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{item.description}</p>

        {item.images?.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {item.images.map((img, i) => (
              <img key={i} src={img.url} alt={item.title} className="rounded-xl object-cover h-48 w-full" />
            ))}
          </div>
        )}

        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {item.tags.map((tag, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm rounded-full">{tag}</span>
            ))}
          </div>
        )}

        {user && item.type === 'found' && item.status === 'open' && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6 space-y-8">
            {/* Option 1: Manual Match with Existing Report */}
            {userLostItems.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FiLink className="text-primary-500" /> Link My Lost Item
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Select one of your reported lost items that matches this found item.
                </p>
                <div className="flex gap-3">
                  <select 
                    value={selectedLostId} 
                    onChange={(e) => setSelectedLostId(e.target.value)}
                    className="input-field flex-1"
                  >
                    <option value="">Select an item...</option>
                    {userLostItems.map(lost => (
                      <option key={lost._id} value={lost._id}>{lost.title} (Reported {new Date(lost.createdAt).toLocaleDateString()})</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleManualMatch} 
                    disabled={manualMatching || !selectedLostId}
                    className="btn-primary px-6 whitespace-nowrap"
                  >
                    {manualMatching ? 'Linking...' : 'Confirm Match'}
                  </button>
                </div>
              </div>
            )}

            {/* Option 2: Standard Claim */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Claim This Item</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Provide a description of the item to prove ownership.
              </p>
              <textarea value={claimDesc} onChange={(e) => setClaimDesc(e.target.value)}
                className="input-field mb-3" rows={3} placeholder="Describe why this item is yours..." />
              <button onClick={handleClaim} disabled={submitting || !claimDesc.trim()}
                className="btn-primary flex items-center gap-2">
                <FiSend /> {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
