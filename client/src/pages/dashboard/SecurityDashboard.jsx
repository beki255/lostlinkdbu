import { useState, useEffect } from 'react';
import { claims as claimsApi } from '../../services/api';
import { FiShield, FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function SecurityDashboard() {
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  const loadClaims = () => {
    setLoading(true);
    claimsApi.getAll({ limit: 50 })
      .then((res) => {
        const allClaims = res.data?.claims || [];
        setClaims(allClaims);
        setStats({
          pending: allClaims.filter(c => c.status === 'pending').length,
          approved: allClaims.filter(c => c.status === 'approved').length,
          rejected: allClaims.filter(c => c.status === 'rejected').length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClaims(); }, []);

  const handleReview = async (claimId, status) => {
    try {
      await claimsApi.review(claimId, { status });
      toast.success(`Claim ${status}!`);
      loadClaims();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const pendingClaims = claims.filter(c => c.status === 'pending');

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-8">
        <FiShield className="w-8 h-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-500">Review and manage item claims</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Pending Review', value: stats.pending, icon: FiClock, color: 'text-yellow-600 bg-yellow-100' },
          { label: 'Approved', value: stats.approved, icon: FiCheckCircle, color: 'text-green-600 bg-green-100' },
          { label: 'Rejected', value: stats.rejected, icon: FiAlertTriangle, color: 'text-red-600 bg-red-100' },
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

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Pending Claims ({pendingClaims.length})</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : pendingClaims.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiCheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>All caught up! No pending claims.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingClaims.map((claim) => (
              <div key={claim._id} className="border border-gray-200 rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{claim.item?.title || 'Unknown Item'}</p>
                    <p className="text-sm text-gray-500 mt-1">Claimant: {claim.claimant?.name} ({claim.claimant?.email})</p>
                    <p className="text-sm text-gray-500">Claim: {claim.description?.substring(0, 100)}</p>
                  </div>
                  <span className="badge-warning">Pending</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleReview(claim._id, 'approved')}
                    className="btn-primary text-sm py-2 px-4">Approve</button>
                  <button onClick={() => handleReview(claim._id, 'rejected')}
                    className="btn-danger text-sm py-2 px-4">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
