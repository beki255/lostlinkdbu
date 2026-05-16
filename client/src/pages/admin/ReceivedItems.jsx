import { useState, useEffect } from 'react';
import { admin as adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { FiPackage, FiUser, FiCalendar, FiMapPin, FiPhone, FiMail, FiSearch, FiDownload } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function ReceivedItems() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReceivedItems();
  }, []);

  const fetchReceivedItems = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getReceivedItems();
      setMatches(res.data.matches || []);
    } catch (err) {
      toast.error('Failed to fetch received items');
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(m => 
    m.lostItem?.title.toLowerCase().includes(search.toLowerCase()) ||
    m.lostItem?.reportedBy?.name.toLowerCase().includes(search.toLowerCase()) ||
    m.foundItem?.reportedBy?.name.toLowerCase().includes(search.toLowerCase())
  );

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('LostLink - Received Items Report', 14, 15);
    
    const tableData = filteredMatches.map(m => [
      new Date(m.resolvedAt).toLocaleDateString(),
      m.lostItem?.title,
      m.lostItem?.reportedBy?.name,
      m.foundItem?.reportedBy?.name,
      m.lostItem?.reportedBy?.phone || 'N/A'
    ]);

    doc.autoTable({
      head: [['Date Resolved', 'Item Title', 'Receiver (Owner)', 'Finder', 'Contact']],
      body: tableData,
      startY: 20
    });

    doc.save('received-items-report.pdf');
  };

  return (
    <div className="page-container max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Received Items</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Audit log of successfully recovered and resolved items.</p>
        </div>
        <button 
          onClick={exportPDF}
          className="btn-primary flex items-center gap-2 w-fit"
        >
          <FiDownload className="w-4 h-4" />
          Export Report
        </button>
      </div>

      <div className="card mb-6 p-4 flex items-center gap-3">
        <FiSearch className="text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by item, receiver or finder..." 
          className="bg-transparent border-none outline-none text-sm w-full dark:text-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="card text-center py-20 bg-gray-50/50 dark:bg-gray-800/20 border-dashed">
          <FiPackage className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">No received items found</h3>
          <p className="text-gray-500 dark:text-gray-400">Items appear here once a match is marked as 'I Received'.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredMatches.map((match) => (
            <div key={match._id} className="card hover:shadow-xl transition-all border-l-4 border-l-green-500">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Lost Item & Owner Info */}
                <div className="lg:col-span-1 border-r border-gray-100 dark:border-gray-700 pr-6">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Lost Item & Receiver</h4>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                      <FiPackage className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{match.lostItem?.title}</h3>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{match.lostItem?.category}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FiCalendar className="w-3.5 h-3.5" />
                      Resolved: {new Date(match.resolvedAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FiMapPin className="w-3.5 h-3.5" />
                      {match.lostItem?.location}
                    </div>
                  </div>
                  {/* Receiver Info */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 overflow-hidden shadow-sm">
                        {match.lostItem?.reportedBy?.avatar ? (
                          <img src={match.lostItem.reportedBy.avatar} alt={match.lostItem?.reportedBy?.name} className="w-full h-full object-cover" />
                        ) : (
                          <FiUser className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{match.lostItem?.reportedBy?.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">ID: {match.lostItem?.reportedBy?.studentId || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1 truncate"><FiMail className="w-3 h-3" /> {match.lostItem?.reportedBy?.email}</span>
                      <span className="flex items-center gap-1"><FiPhone className="w-3 h-3" /> {match.lostItem?.reportedBy?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Found Item & Finder Info */}
                <div className="lg:col-span-1 border-r border-gray-100 dark:border-gray-700 pr-6">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Found Item & Finder</h4>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                      <FiPackage className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{match.foundItem?.title}</h3>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{match.foundItem?.category}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FiCalendar className="w-3.5 h-3.5" />
                      Found: {new Date(match.foundItem?.dateOccurred).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FiMapPin className="w-3.5 h-3.5" />
                      {match.foundItem?.location}
                    </div>
                  </div>
                  {/* Finder Info */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 overflow-hidden shadow-sm">
                        {match.foundItem?.reportedBy?.avatar ? (
                          <img src={match.foundItem.reportedBy.avatar} alt={match.foundItem?.reportedBy?.name} className="w-full h-full object-cover" />
                        ) : (
                          <FiUser className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{match.foundItem?.reportedBy?.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{match.foundItem?.reportedBy?.department || 'Staff'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1 truncate"><FiMail className="w-3 h-3" /> {match.foundItem?.reportedBy?.email}</span>
                      <span className="flex items-center gap-1"><FiPhone className="w-3 h-3" /> {match.foundItem?.reportedBy?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Match Info & Details */}
                <div className="lg:col-span-2 flex flex-col justify-between">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 h-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Match Score</span>
                      <span className="text-green-600 font-bold text-sm">{match.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${match.score}%` }} />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 leading-relaxed italic border-l-2 border-purple-500 pl-3">
                      "{match.aiExplanation}"
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs">
                      <div>
                        <strong className="block text-gray-500 mb-1">Lost Description</strong>
                        <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{match.lostItem?.description}</p>
                      </div>
                      <div>
                        <strong className="block text-gray-500 mb-1">Found Description</strong>
                        <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{match.foundItem?.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
