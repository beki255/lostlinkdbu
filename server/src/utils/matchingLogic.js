/**
 * Fallback Rule-Based Matching Logic
 * Used when AI matching is unavailable or fails.
 */

const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length >= 2));
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length >= 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return (intersection.size / union.size) * 100;
};

const checkComputerSynonym = (text) => {
  if (!text) return false;
  const t = text.toLowerCase();
  return t.includes('pc') || t.includes('computer') || t.includes('laptop') || t.includes('desktop');
};

exports.calculateRuleScore = (lost, found) => {
  const details = {
    titleScore: 0,
    descriptionScore: 0,
    categoryScore: 0,
    locationScore: 0,
    tagScore: 0,
    timeScore: 0,
  };

  // 1. Title & Identifier Similarity (35%)
  details.titleScore = calculateStringSimilarity(lost.title, found.title);
  
  // High-Priority Identifier Matching
  let identifierBonus = 0;
  
  // 1a. Structured Field Matching (Preferred)
  if (lost.serialNumber && found.serialNumber && lost.serialNumber.trim().toLowerCase() === found.serialNumber.trim().toLowerCase()) {
    identifierBonus += 60; // Absolute match on serial number
  } else if (lost.serialNumber && found.serialNumber) {
    // If both have serial numbers but they differ, this is a strong NEGATIVE signal
    identifierBonus -= 30;
  }

  if (lost.ownerName && found.ownerName && lost.ownerName.trim().toLowerCase() === found.ownerName.trim().toLowerCase()) {
    identifierBonus += 25;
  }

  // 1b. Description Parsing Fallback (if structured fields are missing)
  const lostText = `${lost.title} ${lost.description}`.toLowerCase();
  const foundText = `${found.title} ${found.description}`.toLowerCase();

  const snPattern = /(?:s\/n|serial|sn|id)\s*[:#\- ]?\s*([a-z0-9\-]{4,})/gi;
  const lostSNs = [...lostText.matchAll(snPattern)].map(m => m[1]);
  const foundSNs = [...foundText.matchAll(snPattern)].map(m => m[1]);

  if (lostSNs.length > 0 && foundSNs.length > 0 && identifierBonus < 60) {
    const commonSN = lostSNs.find(sn => foundSNs.includes(sn));
    if (commonSN) {
      identifierBonus += 50; 
    }
  }

  // Check for Owner Name in text if not in structured fields
  if (lost.reportedBy?.name && foundText.includes(lost.reportedBy.name.toLowerCase()) && identifierBonus < 25) {
    identifierBonus += 20;
  }

  // Special case for computers
  if (checkComputerSynonym(lost.title) && checkComputerSynonym(found.title)) {
    details.titleScore = Math.max(details.titleScore, 85);
  }

  // 2. Description Similarity (10%)
  details.descriptionScore = calculateStringSimilarity(lost.description, found.description);

  // 3. Category Match (35%)
  if (lost.category === found.category) {
    details.categoryScore = 100;
  } else if (lost.category?.toLowerCase().includes(found.category?.toLowerCase()) || 
             found.category?.toLowerCase().includes(lost.category?.toLowerCase())) {
    details.categoryScore = 60;
  }

  // 4. Location Proximity (20%)
  if (lost.location === found.location) {
    details.locationScore = 100;
  } else if (lost.building === found.building && lost.building) {
    details.locationScore = 85;
  }

  // 5. Time Proximity
  if (lost.dateOccurred && found.dateOccurred) {
    const d1 = new Date(lost.dateOccurred);
    const d2 = new Date(found.dateOccurred);
    const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
    
    if (diffDays <= 1) details.timeScore = 100;
    else if (diffDays <= 3) details.timeScore = 80;
    else if (diffDays <= 7) details.timeScore = 50;
  }

  // 6. Tags Match (10%)
  if (lost.tags && found.tags && lost.tags.length > 0 && found.tags.length > 0) {
    const commonTags = lost.tags.filter(tag => found.tags.includes(tag));
    details.tagScore = (commonTags.length / Math.max(lost.tags.length, found.tags.length)) * 100;
  }

  // Calculate Weighted Average (Priority: All 6 attributes)
  let score = (
    (details.categoryScore * 0.20) +
    (details.titleScore * 0.20) +
    (details.locationScore * 0.15) +
    (details.descriptionScore * 0.15) +
    (details.tagScore * 0.15) +
    (details.timeScore * 0.15)
  );

  // Apply Bonuses
  score += identifierBonus;
  score = Math.min(score, 100);

  return {
    score: Math.round(score),
    details,
    explanation: identifierBonus >= 50 
      ? `Critical Match! An identical serial number or unique ID was found in both reports.`
      : `Rule-based match (${Math.round(score)}%) based on text similarity, category, location, and time proximity.`
  };
};
