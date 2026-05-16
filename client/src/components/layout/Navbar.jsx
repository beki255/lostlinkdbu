import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { FiLogOut, FiUser, FiBell, FiMenu, FiX } from 'react-icons/fi';
import { useState } from 'react';
import { changeLanguage } from '../../i18n';
import { hasRole } from '../../utils/auth';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [];
  if (isAuthenticated) {
    navLinks.push({ to: '/dashboard', label: t('nav.dashboard') });
    navLinks.push({ to: '/report', label: t('nav.report') });
    navLinks.push({ to: '/matches', label: 'AI Matches' });
    navLinks.push({ to: '/items', label: t('nav.search') });
    if (hasRole('admin')) navLinks.push({ to: '/admin', label: t('nav.admin') });
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="font-bold text-xl text-gray-900">{t('app.name')}</span>
            </Link>
            <div className="hidden md:flex ml-10 space-x-1">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button onClick={() => changeLanguage(i18n.language === 'en' ? 'am' : 'en')}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              {i18n.language === 'en' ? 'አማ' : 'EN'}
            </button>

            {isAuthenticated ? (
              <>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg relative">
                  <FiBell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>
                <Link to="/profile" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                    <FiUser className="w-4 h-4" />
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700">{user?.name}</span>
                </Link>
                <button onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg">
                  <FiLogOut className="w-5 h-5" />
                </button>
                <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
                  {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn-secondary text-sm">Sign In</Link>
                <Link to="/register" className="btn-primary text-sm">Get Started</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white p-4 space-y-2">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}
              className="block px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
              onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
