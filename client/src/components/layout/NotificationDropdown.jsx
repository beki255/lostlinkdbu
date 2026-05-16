import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications as notificationsApi } from '../../services/api';
import {
  FiBell, FiCheck, FiMessageCircle, FiCpu,
  FiShield, FiAlertCircle, FiClock, FiCheckCircle,
  FiX, FiFileText,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const typeConfig = {
  item_matched: { icon: FiCpu, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  new_message: { icon: FiMessageCircle, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  claim_submitted: { icon: FiFileText, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  claim_approved: { icon: FiCheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  claim_rejected: { icon: FiAlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  item_status_update: { icon: FiShield, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700' },
  system: { icon: FiBell, color: 'text-primary-500', bg: 'bg-primary-100 dark:bg-primary-900/30' },
};

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function NotificationDropdown({ onClose, onUpdateCount, excludeRef }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    notificationsApi.getAll({ limit: 10 })
      .then((res) => {
        setNotifications(res.data?.notifications || []);
        setUnreadCount(res.data?.unreadCount || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        // If excludeRef is provided and the click is on the excluded element, do nothing
        if (excludeRef?.current && excludeRef.current.contains(e.target)) {
          return;
        }
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, excludeRef]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (onUpdateCount) onUpdateCount();
    } catch {}
  };

  const handleClearAll = async () => {
    try {
      await notificationsApi.deleteAll();
      setNotifications([]);
      setUnreadCount(0);
      if (onUpdateCount) onUpdateCount();
    } catch {}
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await notificationsApi.markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => n._id === notification._id ? { ...n, isRead: true } : n)
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        if (onUpdateCount) onUpdateCount();
      } catch {}
    }
    if (notification.data?.url) {
      navigate(notification.data.url);
    }
    onClose();
  };

  const getIcon = (type) => {
    const config = typeConfig[type] || typeConfig.system;
    return config;
  };

  return (
    <div ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FiBell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="text-xs text-primary-500 hover:text-primary-600 font-medium">
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleClearAll}
              className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors">
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 px-5">
            <FiBell className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No notifications yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              You'll see updates here when items match or messages arrive.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notification) => {
              const config = getIcon(notification.type);
              const Icon = config.icon;
              return (
                <button key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex gap-3 ${!notification.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                      <FiClock className="w-3 h-3" />
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button onClick={onClose}
        className="w-full py-3 text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 font-medium">
        Close
      </button>
    </div>
  );
}
