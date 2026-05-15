const TOKEN_KEY = 'lostlink_token';
const USER_KEY = 'lostlink_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

export const getUser = () => {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => !!getToken();

export const hasRole = (role) => {
  const user = getUser();
  return user?.role === role;
};

export const canAccess = (...roles) => {
  const user = getUser();
  return user && roles.includes(user.role);
};
