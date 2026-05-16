export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

export const ITEM_TYPES = {
  LOST: 'lost',
  FOUND: 'found',
};

export const ITEM_STATUS = {
  OPEN: 'open',
  CLAIMED: 'claimed',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

export const CLAIM_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
};

export const OTP_TYPES = {
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
};

export const NOTIFICATION_TYPES = {
  CLAIM_SUBMITTED: 'claim_submitted',
  CLAIM_APPROVED: 'claim_approved',
  CLAIM_REJECTED: 'claim_rejected',
  ITEM_MATCHED: 'item_matched',
  NEW_MESSAGE: 'new_message',
  ITEM_STATUS_UPDATE: 'item_status_update',
  SYSTEM: 'system',
};

export const CATEGORIES = [
  'electronics',
  'documents',
  'clothing',
  'accessories',
  'books',
  'other',
];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const AI_DECISIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  MANUAL_REVIEW: 'manual_review',
};
