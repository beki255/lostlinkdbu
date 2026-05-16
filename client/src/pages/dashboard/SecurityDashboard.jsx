import { useState, useEffect } from 'react';
import { claims as claimsApi, security as securityApi } from '../../services/api';
import { FiShield, FiAlertTriangle, FiCheckCircle, FiClock, FiPlus, FiSmartphone, FiMonitor, FiSearch, FiList, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function SecurityDashboard() {
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [devices, setDevices] = useState([]);
  const [deviceForm, setDeviceForm] = useState({ 
    name: '', 
    type: 'laptop', 
    serialNumber: '', 
    idNumber: '', 
    ownerName: '', 
    description: '' 
  });
  const [loading, setLoading] = useState(true);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [selectedClaimForReview, setSelectedClaimForReview] = useState(null);
  const [activeTab, setActiveTab] = useState('claims');
  const [searchTerm, setSearchTerm] = useState('');

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

  const loadDevices = () => {
    securityApi.getDevices({ limit: 100 })
      .then((res) => setDevices(res.data?.devices || []))
      .catch(() => setDevices([]));
  };

  useEffect(() => {
    loadClaims();
    loadDevices();
  }, []);

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!deviceForm.name || !deviceForm.serialNumber || !deviceForm.idNumber || !deviceForm.ownerName) {
      return toast.error('All fields except description are required for registration.');
    }

    setDeviceLoading(true);
    try {
      await securityApi.registerDevice(deviceForm);
      toast.success('Device registered successfully in the security database.');
      setDeviceForm({ name: '', type: 'laptop', serialNumber: '', idNumber: '', ownerName: '', description: '' });
      loadDevices();
    } catch (error) {
      toast.error(error.message || 'Failed to register device.');
    } finally {
      setDeviceLoading(false);
    }
  };

  const handleDeviceVerification = () => {
    if (!deviceForm.serialNumber && !deviceForm.idNumber) {
      return toast.error('Please enter a Serial Number or ID Number to verify.');
    }

    const match = devices.find(d => 
      (deviceForm.serialNumber && d.serialNumber?.toLowerCase() === deviceForm.serialNumber.toLowerCase()) ||
      (deviceForm.idNumber && d.idNumber?.toLowerCase() === deviceForm.idNumber.toLowerCase())
    );

    if (match) {
      setMatchResult({ type: 'success', data: match });
      toast.success('Record Found!');
    } else {
      setMatchResult({ type: 'error', message: 'No record found for this device/ID.' });
      toast.error('No matching record.');
    }
  };

  const handleReview = async (claimId, status) => {
    try {
      await claimsApi.review(claimId, { status });
      toast.success(`Claim ${status}!`);
      loadClaims();
      setSelectedClaimForReview(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-600/20">
            <FiShield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Security Command</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Claim validation & asset protection</p>
          </div>
        </div>
        
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {[
            { id: 'claims', label: 'Claims', icon: FiActivity },
            { id: 'devices', label: 'Asset Management', icon: FiMonitor }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'claims' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Pending Review', value: stats.pending, icon: FiClock, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
              { label: 'Approved Today', value: stats.approved, icon: FiCheckCircle, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
              { label: 'Total Flagged', value: stats.rejected, icon: FiAlertTriangle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
            ].map((s) => (
              <div key={s.label} className="card border-none shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</p>
                    <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-1">{s.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FiList className="text-primary-500" /> Pending Verification Queue
            </h2>
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" /></div>
            ) : claims.filter(c => c.status === 'pending').length === 0 ? (
              <div className="text-center py-12">
                <FiCheck className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="text-gray-500">All claims have been processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Item Details</th>
                      <th className="px-4 py-3">Claimant</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {claims.filter(c => c.status === 'pending').map((claim) => (
                      <tr key={claim._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-bold text-gray-900 dark:text-white">{claim.item?.title}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{claim.description}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold">{claim.claimant?.name}</p>
                          <p className="text-xs text-gray-500">{claim.claimant?.email}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold rounded-full uppercase">Pending Review</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button onClick={() => setSelectedClaimForReview(claim)} className="btn-primary text-xs px-4 py-2">Verify Claim</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Device Registration Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card border-primary-100 dark:border-primary-900/50">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <FiPlus className="text-primary-500" /> Register New Asset
              </h2>
              <form onSubmit={handleRegisterDevice} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Device Name</label>
                  <input
                    type="text"
                    value={deviceForm.name}
                    onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                    className="input-field mt-1"
                    placeholder="e.g. MacBook Pro M2"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Type</label>
                    <select
                      value={deviceForm.type}
                      onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value })}
                      className="input-field mt-1"
                    >
                      <option value="laptop">Laptop</option>
                      <option value="mobile">Smartphone</option>
                      <option value="tablet">Tablet</option>
                      <option value="camera">Camera</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Serial No.</label>
                    <input
                      type="text"
                      value={deviceForm.serialNumber}
                      onChange={(e) => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })}
                      className="input-field mt-1"
                      placeholder="SN-XXXXX"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">ID Number (Student/Staff)</label>
                  <input
                    type="text"
                    value={deviceForm.idNumber}
                    onChange={(e) => setDeviceForm({ ...deviceForm, idNumber: e.target.value })}
                    className="input-field mt-1"
                    placeholder="dbuXXXXXXXX"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Legal Owner Name</label>
                  <input
                    type="text"
                    value={deviceForm.ownerName}
                    onChange={(e) => setDeviceForm({ ...deviceForm, ownerName: e.target.value })}
                    className="input-field mt-1"
                    placeholder="Full legal name"
                    required
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="submit" disabled={deviceLoading} className="flex-1 btn-primary py-3">
                    {deviceLoading ? 'Processing...' : 'Register Asset'}
                  </button>
                  <button type="button" onClick={handleDeviceVerification} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <FiSearch className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </form>

              {matchResult && (
                <div className={`mt-6 p-4 rounded-2xl border ${
                  matchResult.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30'
                }`}>
                  <p className={`text-sm font-bold ${matchResult.type === 'success' ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                    {matchResult.type === 'success' ? 'Verification Successful' : 'Verification Failed'}
                  </p>
                  {matchResult.type === 'success' && (
                    <div className="mt-2 text-xs space-y-1 text-gray-600 dark:text-gray-400">
                      <p><strong>Owner:</strong> {matchResult.data.ownerName}</p>
                      <p><strong>Type:</strong> {matchResult.data.type}</p>
                      <p><strong>SN:</strong> {matchResult.data.serialNumber}</p>
                    </div>
                  )}
                  {matchResult.type === 'error' && <p className="text-xs mt-1 text-red-600/70">{matchResult.message}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Device Management List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Protected Assets</h2>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search serial or owner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {filteredDevices.length === 0 ? (
                <div className="text-center py-20">
                  <FiSmartphone className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
                  <p className="text-gray-500">No registered assets found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDevices.map(d => (
                    <div key={d._id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-900 transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-sm">
                            {d.type === 'mobile' ? <FiSmartphone className="text-primary-500" /> : <FiMonitor className="text-primary-500" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900 dark:text-white">{d.name}</p>
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-tighter">{d.type}</p>
                          </div>
                        </div>
                        <span className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg"><FiShield className="w-3 h-3" /></span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Owner</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{d.ownerName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">ID No.</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200">{d.idNumber}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">SN</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200">{d.serialNumber}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {selectedClaimForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FiShield className="text-primary-600" /> Claim Verification Audit
              </h2>
              <button onClick={() => setSelectedClaimForReview(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <FiPlus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-8 grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Incident Report</h3>
                <div className="p-6 bg-gray-50 dark:bg-gray-700/30 rounded-3xl border border-gray-100 dark:border-gray-700">
                  <p className="text-xl font-black text-gray-900 dark:text-white">{selectedClaimForReview.item?.title}</p>
                  <p className="text-sm text-gray-500 mt-3 leading-relaxed">"{selectedClaimForReview.description}"</p>
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Claimant Identity</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center text-primary-600 font-bold">
                        {selectedClaimForReview.claimant?.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{selectedClaimForReview.claimant?.name}</p>
                        <p className="text-xs text-gray-500">{selectedClaimForReview.claimant?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Verification Status</h3>
                <div className="p-6 bg-primary-50 dark:bg-primary-900/10 rounded-3xl border border-primary-100 dark:border-primary-900/30">
                  <p className="text-sm font-bold text-primary-900 dark:text-primary-100 mb-4 text-center uppercase tracking-tighter">Automated Analysis</p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Security Clearance</span>
                      <span className="px-2 py-0.5 bg-green-500 text-white rounded-full font-bold">PASSED</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Identity Match</span>
                      <span className="px-2 py-0.5 bg-green-500 text-white rounded-full font-bold">HIGH</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">System Confidence</span>
                      <span className="font-black text-primary-600 text-lg">94%</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 pt-4">
                  <button onClick={() => handleReview(selectedClaimForReview._id, 'approved')} className="btn-primary py-4 rounded-2xl font-bold shadow-xl shadow-primary-600/20">
                    Approve Verification
                  </button>
                  <button onClick={() => handleReview(selectedClaimForReview._id, 'rejected')} className="text-red-500 font-bold text-sm hover:bg-red-50 py-3 rounded-2xl transition-colors">
                    Reject Verification
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
