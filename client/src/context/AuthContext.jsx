import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi } from '../services/api';
import { getToken, setToken, getUser, setUser, clearAuth, isAuthenticated } from '../utils/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated()) {
        try {
          const res = await authApi.getMe();
          const userData = res.data.user;
          setUser(userData);
          setUserState(userData);
        } catch {
          clearAuth();
          setUserState(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    setToken(res.data.token);
    setUser(res.data.user);
    setUserState(res.data.user);
    return res.data.user;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const res = await authApi.googleLogin(credential);
    setToken(res.data.token);
    setUser(res.data.user);
    setUserState(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (data) => {
    await authApi.register(data);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUserState(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const res = await authApi.updateProfile(data);
    setUser(res.data.user);
    setUserState(res.data.user);
    return res.data.user;
  }, []);

  const changePassword = useCallback(async (data) => {
    const res = await authApi.changePassword(data);
    return res;
  }, []);

  const completeAuth = useCallback((token, userData) => {
    setToken(token);
    setUser(userData);
    setUserState(userData);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, login, googleLogin, register, logout, updateProfile, changePassword, completeAuth,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isUser: user?.role === 'user',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
