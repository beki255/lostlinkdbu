import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { items as itemsApi, claims as claimsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiMapPin, FiCalendar, FiUser, FiArrowLeft, FiSend } from 'react-icons/fi';

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimDesc, setClaimDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    itemsApi.getById(id)
      .then((res) => setItem(res.data.item))
      .catch(() => toast.error('Item not found'))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (loading) return <div className="page-container text-center py-16 text-gray-500">Loading...</div>;
  if (!item) return <div className="page-container text-center py-16 text-gray-500">Item not found.</div>;

  return (
    <div className="page-container max-w-3xl">
      <Link to="/items" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <FiArrowLeft className="w-4 h-4 mr-1" /> Back to items
      </Link>

      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
            <p className="text-gray-500 mt-1">Reported by {item.reportedBy?.name || 'Anonymous'}</p>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>{item.type}</span>
            <span className={`badge ${item.status === 'open' ? 'badge-primary' : item.status === 'claimed' ? 'badge-warning' : 'badge-success'}`}>{item.status}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
          <span className="flex items-center gap-1"><FiMapPin className="w-4 h-4" /> {item.location}</span>
          <span className="flex items-center gap-1"><FiCalendar className="w-4 h-4" /> {new Date(item.createdAt).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><FiUser className="w-4 h-4" /> {item.category}</span>
        </div>

        <p className="text-gray-700 leading-relaxed mb-6">{item.description}</p>

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
              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">{tag}</span>
            ))}
          </div>
        )}

        {user && item.type === 'found' && item.status === 'open' && (
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Claim This Item</h3>
            <textarea value={claimDesc} onChange={(e) => setClaimDesc(e.target.value)}
              className="input-field mb-3" rows={3} placeholder="Describe why this item is yours..." />
            <button onClick={handleClaim} disabled={submitting || !claimDesc.trim()}
              className="btn-primary flex items-center gap-2">
              <FiSend /> {submitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
