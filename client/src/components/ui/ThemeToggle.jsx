import { useTheme } from '../../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useCallback } from 'react';

export default function ThemeToggle({ className = "" }) {
  const { darkMode, toggleDarkMode } = useTheme();

  const handleToggle = useCallback(() => {
    toggleDarkMode();
  }, [toggleDarkMode]);

  return (
    <button
      onClick={handleToggle}
      className={`p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${className}`}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Light mode" : "Dark mode"}
    >
      {darkMode ? (
        <FiSun className="w-5 h-5" aria-hidden="true" />
      ) : (
        <FiMoon className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}
