import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { getToken } from '../../utils/auth';
import { FiLogOut, FiUser, FiBell, FiMenu, FiX, FiSettings } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import { changeLanguage } from '../../i18n';
import { hasRole } from '../../utils/auth';
import { notifications as notificationsApi } from '../../services/api';
import NotificationDropdown from './NotificationDropdown';
import ThemeToggle from '../ui/ThemeToggle';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifButtonRef = useRef(null);
  const userMenuRef = useRef(null);

  const fetchUnreadCount = () => {
    if (!isAuthenticated) return;
    notificationsApi.getUnreadCount()
      .then((res) => setUnreadCount(res.data?.unreadCount || 0))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUnreadCount();

    if (isAuthenticated) {
      const socket = io('/chat', {
        auth: { token: getToken() },
        transports: ['websocket']
      });

      socket.on('connect', () => {
        console.log('Navbar connected to notification socket');
      });

      socket.on('new-message', () => {
        fetchUnreadCount();
      });

      socket.on('notification', () => {
        fetchUnreadCount();
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [];
  if (isAuthenticated) {
    navLinks.push({ to: '/dashboard', label: t('nav.dashboard') });
    if (!hasRole('admin') && !hasRole('security')) {
      navLinks.push({ to: '/report', label: t('nav.report') });
      navLinks.push({ to: '/items', label: 'Find Item' });
    }
    if (hasRole('admin')) {
      // navLinks.push({ to: '/admin', label: 'Overview' });
      navLinks.push({ to: '/admin/users', label: 'User Mgmt' });
      navLinks.push({ to: '/admin/cms', label: 'CMS' });
      navLinks.push({ to: '/admin/reports', label: 'Reports' });
      navLinks.push({ to: '/admin/lost-found', label: 'L&F Users' });
      navLinks.push({ to: '/admin/received', label: 'Received' });
    }
    if (hasRole('security')) {
      navLinks.push({ to: '/dashboard', label: 'Device Mgmt' });
    }
  }

  return (
    <nav className="bg-white/80 dark:bg-dbu-navy/80 backdrop-blur-xl sticky top-0 z-50 border-b border-dbu-blue/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <img src="/dbuicon.png" alt="DBU Logo" className="h-10 w-auto group-hover:scale-110 transition-transform duration-300" />
              <span className="font-black text-2xl text-dbu-navy dark:text-dbu-blue tracking-tighter uppercase">{t('app.name')}</span>
            </Link>
            <div className="hidden md:flex ml-12 space-x-1">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to}
                  className="px-5 py-2.5 text-sm font-bold text-dbu-navy/70 dark:text-dbu-white/70 hover:text-dbu-blue dark:hover:text-dbu-blue hover:bg-dbu-blue/5 dark:hover:bg-dbu-blue/10 rounded-xl transition-all duration-300">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <ThemeToggle />

            <button onClick={() => changeLanguage(i18n.language === 'en' ? 'am' : 'en')}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">
              {i18n.language === 'en' ? 'አማ' : 'EN'}
            </button>

            {isAuthenticated ? (
              <>
                <div className="relative">
                  <button
                    ref={notifButtonRef}
                    onClick={() => setNotifOpen(!notifOpen)}
                    className={`p-2 rounded-lg relative transition-colors ${
                      notifOpen 
                        ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FiBell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <NotificationDropdown 
                      onClose={() => setNotifOpen(false)} 
                      onUpdateCount={fetchUnreadCount}
                      excludeRef={notifButtonRef}
                    />
                  )}
                </div>
                <Link to="/settings" className="flex items-center space-x-3 p-1.5 hover:bg-dbu-blue/5 dark:hover:bg-dbu-blue/10 rounded-2xl transition-all duration-300 border border-transparent hover:border-dbu-blue/10">
                  <div className="w-10 h-10 bg-dbu-blue/10 dark:bg-dbu-blue/20 text-dbu-blue rounded-full flex items-center justify-center overflow-hidden shadow-inner">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
                    ) : (
                      <FiUser className="w-4 h-4" />
                    )}
                  </div>
                  <span className="hidden md:block text-sm font-semibold text-gray-700 dark:text-gray-200 pr-2">{user?.name}</span>
                </Link>
                <button onClick={handleLogout}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                  <FiLogOut className="w-5 h-5" />
                </button>
                <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
                  {mobileOpen ? <FiX className="w-6 h-6 text-gray-600 dark:text-gray-300" /> : <FiMenu className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn-secondary text-sm">{t('nav.login')}</Link>
                <Link to="/register" className="btn-primary text-sm">{t('nav.register')}</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}
              className="block px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
