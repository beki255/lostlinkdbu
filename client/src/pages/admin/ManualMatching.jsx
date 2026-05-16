// src/pages/admin/ManualMatching.jsx
import { useState, useEffect } from 'react';
import { admin as adminApi, matches as matchesApi } from '../../services/api';
import { FiCpu, FiUser, FiMapPin, FiCalendar, FiCheck, FiX, FiSearch, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ManualMatching() {
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [selectedLost, setSelectedLost] = useState(null);
  const [selectedFound, setSelectedFound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentMatches, setRecentMatches] = useState([]);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadItems();
    loadRecentMatches();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const [lostRes, foundRes] = await Promise.all([
        adminApi.getAllItems({ type: 'lost', status: 'open', limit: 100 }),
        adminApi.getAllItems({ type: 'found', status: 'open', limit: 100 }),
      ]);
      setLostItems(lostRes.data?.items || []);
      setFoundItems(foundRes.data?.items || []);
    } catch (error) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentMatches = async () => {
    try {
      const res = await matchesApi.getAll();
      setRecentMatches((res.data?.matches || []).slice(0, 10));
    } catch (error) {
      console.error('Failed to load recent matches');
    }
  };

  const filterBySearch = (items, isLost = true) => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.title.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term) ||
      (isLost && item.reportedBy?.name?.toLowerCase().includes(term))
    );
  };

  // Check for PC/Laptop/Computer keywords
  const isComputerDevice = (item) => {
    const computerKeywords = ['pc', 'laptop', 'computer', 'macbook', 'mac book', 'notebook', 'desktop', 'labtop'];
    const text = `${item.title} ${item.description} ${item.category}`.toLowerCase();
    // Normalize text: treat 'pc', 'computer', 'laptop', 'labtop' as same word
    return computerKeywords.some(keyword => text.includes(keyword));
  };

  const calculateManualScore = (lost, found) => {
    let score = 0;
    let details = {
      titleScore: 0,
      descriptionScore: 0,
      categoryScore: 0,
      locationScore: 0,
      tagScore: 0,
      timeScore: 0,
    };

    // Check for computer/device specific matching
    const lostIsComputer = isComputerDevice(lost);
    const foundIsComputer = isComputerDevice(found);
    
    let computerBonus = 0;
    if (lostIsComputer && foundIsComputer) {
      computerBonus += 15; // Base bonus for both being computers
    }

    // Advanced Device Matching (Serial No, ID No)
    const extractSerial = (text) => {
      const match = text.match(/(?:serial|sn|s\/n)[:\s]*([A-Z0-9\-]{4,})/i);
      return match ? match[1].toUpperCase() : null;
    };

    const extractId = (text) => {
      const match = text.match(/(?:id|id no|identity)[:\s]*([A-Z0-9\-]{4,})/i);
      return match ? match[1].toUpperCase() : null;
    };

    const lostSerial = extractSerial(lost.description) || extractSerial(lost.title);
    const foundSerial = extractSerial(found.description) || extractSerial(found.title);
    
    if (lostSerial && foundSerial && lostSerial === foundSerial) {
      computerBonus += 40; // Very strong match for serial number
    }

    const lostId = extractId(lost.description) || extractId(lost.title);
    const foundId = extractId(found.description) || extractId(found.title);
    
    if (lostId && foundId && lostId === foundId) {
      computerBonus += 35; // Strong match for ID number
    }

    // Owner / User Name Matching
    const lostOwner = lost.reportedBy?.name?.toLowerCase();
    const foundOwner = found.reportedBy?.name?.toLowerCase() || found.description.match(/owner[:\s]*([a-z\s]+)/i)?.[1]?.toLowerCase();
    
    if (lostOwner && foundOwner && (lostOwner.includes(foundOwner) || foundOwner.includes(lostOwner))) {
      computerBonus += 20; // Bonus for owner name similarity
    }

    // Title similarity (25% weight)
    const normalizeDeviceWords = (t) => t.replace(/\b(pc|laptop|computer|labtop|notebook|desktop)\b/g, 'device_token');
    
    const lostTitle = normalizeDeviceWords(lost.title.toLowerCase());
    const foundTitle = normalizeDeviceWords(found.title.toLowerCase());
    const titleWords = lostTitle.split(' ');
    let titleMatches = 0;
    titleWords.forEach(word => {
      if (foundTitle.includes(word) && word.length > 2) titleMatches++;
    });
    details.titleScore = Math.min(100, (titleMatches / Math.max(1, titleWords.length)) * 100);
    score += details.titleScore * 0.25;

    // Category match (20% weight)
    if (lost.category?.toLowerCase() === found.category?.toLowerCase()) {
      details.categoryScore = 100;
      score += 20;
    } else if (lostIsComputer && foundIsComputer) {
      details.categoryScore = 80;
      score += 16;
    } else {
      details.categoryScore = 0;
    }

    // Location proximity (15% weight)
    if (lost.location?.toLowerCase() === found.location?.toLowerCase()) {
      details.locationScore = 100;
      score += 15;
    } else if (lost.location?.toLowerCase().includes(found.location?.toLowerCase()) ||
               found.location?.toLowerCase().includes(lost.location?.toLowerCase())) {
      details.locationScore = 70;
      score += 10.5;
    }

    // Tag overlap (10% weight)
    const lostTags = (lost.tags || []).map(t => t.toLowerCase());
    const foundTags = (found.tags || []).map(t => t.toLowerCase());
    const commonTags = lostTags.filter(t => foundTags.includes(t));
    details.tagScore = (commonTags.length / Math.max(1, lostTags.length)) * 100;
    score += details.tagScore * 0.1;

    // Time proximity (5% weight)
    const lostDate = new Date(lost.dateOccurred || lost.createdAt);
    const foundDate = new Date(found.dateOccurred || found.createdAt);
    const daysDiff = Math.abs(lostDate - foundDate) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 1) details.timeScore = 100;
    else if (daysDiff <= 3) details.timeScore = 75;
    else if (daysDiff <= 7) details.timeScore = 50;
    else if (daysDiff <= 14) details.timeScore = 25;
    else details.timeScore = 0;
    score += details.timeScore * 0.05;

    // Description keyword matching (25% weight)
    const lostDesc = lost.description.toLowerCase();
    const foundDesc = found.description.toLowerCase();
    const keywords = lostDesc.split(' ').filter(w => w.length > 3);
    let keywordMatches = 0;
    keywords.forEach(word => {
      if (foundDesc.includes(word)) keywordMatches++;
    });
    details.descriptionScore = (keywordMatches / Math.max(1, keywords.length)) * 100;
    score += details.descriptionScore * 0.25;

    // Add computer bonus
    score += computerBonus;
    
    return { score: Math.min(100, Math.round(score)), details, computerBonus };
  };

  const createManualMatch = async () => {
    if (!selectedLost || !selectedFound) {
      toast.error('Please select both a lost item and a found item');
      return;
    }

    const { score, details, computerBonus } = calculateManualScore(selectedLost, selectedFound);
    
    if (score < 50) {
      toast.error(`Match score (${score}%) is too low. Consider if these items really match.`);
      return;
    }

    setMatching(true);
    try {
      await matchesApi.createManualMatch({
        lostItemId: selectedLost._id,
        foundItemId: selectedFound._id,
        score,
        details,
        explanation: `Manually matched by admin. ${adminNotes ? `Admin Notes: ${adminNotes}. ` : ''}Score: ${score}% based on ${Object.entries(details).filter(([_, v]) => v > 0).length} matching criteria.${computerBonus > 0 ? ` Computer device bonus: +${computerBonus}%` : ''}`,
      });
      toast.success(`Match created with ${score}% confidence!`);
      setSelectedLost(null);
      setSelectedFound(null);
      setAdminNotes('');
      loadItems();
      loadRecentMatches();
    } catch (error) {
      toast.error(error.message || 'Failed to create match');
    } finally {
      setMatching(false);
    }
  };

  const clearSelection = () => {
    setSelectedLost(null);
    setSelectedFound(null);
  };

  const filteredLost = filterBySearch(lostItems, true);
  const filteredFound = filterBySearch(foundItems, false);

  const getMatchPreview = () => {
    if (!selectedLost || !selectedFound) return null;
    const { score, computerBonus } = calculateManualScore(selectedLost, selectedFound);
    return (
      <div className={`mt-4 p-4 rounded-xl ${score >= 70 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : score >= 50 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Match Score</p>
            <p className={`text-3xl font-bold ${score >= 70 ? 'text-green-600 dark:text-green-400' : score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500'}`}>
              {score}%
            </p>
            {computerBonus > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">+{computerBonus}% computer device bonus</p>
            )}
          </div>
          {score >= 70 && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <FiCheck className="w-5 h-5" />
              <span className="text-sm font-medium">Good Match</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Admin Override Notes (Optional)</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="Reason for manual match..."
            rows="2"
          />
        </div>
        <button
          onClick={createManualMatch}
          disabled={matching}
          className="mt-3 w-full btn-primary py-2 text-sm flex items-center justify-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          {matching ? 'Creating Match...' : 'Create Match'}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="card">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search items by title, description, category, location, or owner name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10 py-3"
          />
        </div>
      </div>

      {/* Selection Area */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lost Items Column */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Lost Items ({filteredLost.length})
            </h3>
            {selectedLost && (
              <button onClick={() => setSelectedLost(null)} className="text-xs text-red-600 hover:text-red-700">
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : filteredLost.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No lost items found</div>
            ) : (
              filteredLost.map(item => (
                <button
                  key={item._id}
                  onClick={() => setSelectedLost(item)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedLost?._id === item._id
                      ? 'bg-red-50 border-2 border-red-300 dark:bg-red-900/20 dark:border-red-700'
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3" /> {item.location}</span>
                        <span className="flex items-center gap-1"><FiUser className="w-3 h-3" /> {item.reportedBy?.name || 'Unknown'}</span>
                        <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      {isComputerDevice(item) && (
                        <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          💻 Computer/Laptop
                        </span>
                      )}
                    </div>
                    {selectedLost?._id === item._id && (
                      <FiCheck className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Found Items Column */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Found Items ({filteredFound.length})
            </h3>
            {selectedFound && (
              <button onClick={() => setSelectedFound(null)} className="text-xs text-green-600 hover:text-green-700">
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : filteredFound.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No found items found</div>
            ) : (
              filteredFound.map(item => (
                <button
                  key={item._id}
                  onClick={() => setSelectedFound(item)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedFound?._id === item._id
                      ? 'bg-green-50 border-2 border-green-300 dark:bg-green-900/20 dark:border-green-700'
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3" /> {item.location}</span>
                        <span className="flex items-center gap-1"><FiUser className="w-3 h-3" /> {item.reportedBy?.name || 'Unknown'}</span>
                        <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      {isComputerDevice(item) && (
                        <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          💻 Computer/Laptop
                        </span>
                      )}
                    </div>
                    {selectedFound?._id === item._id && (
                      <FiCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Match Preview */}
      {(selectedLost || selectedFound) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Match Preview</h3>
            <button onClick={clearSelection} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <FiX className="w-4 h-4" /> Clear All
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {selectedLost && (
              <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">Selected Lost Item</p>
                <p className="font-medium mt-1">{selectedLost.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Owner: {selectedLost.reportedBy?.name}</p>
              </div>
            )}
            {selectedFound && (
              <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Selected Found Item</p>
                <p className="font-medium mt-1">{selectedFound.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Finder: {selectedFound.reportedBy?.name}</p>
              </div>
            )}
          </div>
          {selectedLost && selectedFound && getMatchPreview()}
        </div>
      )}

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Matches</h3>
          <div className="space-y-2">
            {recentMatches.map(match => (
              <div key={match._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {match.lostItem?.title} ↔ {match.foundItem?.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Score: {Math.round(match.score)}% • Status: {match.status}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  match.score >= 85 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                  match.score >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {match.score >= 85 ? 'Strong' : match.score >= 70 ? 'Good' : 'Weak'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}