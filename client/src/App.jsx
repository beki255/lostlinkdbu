import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyOtp from './pages/auth/VerifyOtp';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import UserDashboard from './pages/dashboard/UserDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import ReportItem from './pages/items/ReportItem';
import ItemDetail from './pages/items/ItemDetail';
import ItemList from './pages/items/ItemList';
import Matches from './pages/items/Matches';
import MatchDetail from './pages/items/MatchDetail';
import ReportResult from './pages/items/ReportResult';
import ChatView from './pages/dashboard/ChatView';
import Profile from './pages/dashboard/Profile';
import Settings from './pages/dashboard/Settings';
import UserManagement from './pages/admin/UserManagement';
import Reports from './pages/admin/Reports';
import LostFoundUsers from './pages/admin/LostFoundUsers';
import ReceivedItems from './pages/admin/ReceivedItems';
import UserDetail from './pages/admin/UserDetail';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated: auth, user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" /></div>;
  if (!auth) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route element={<Layout />}>
        <Route path="/items" element={
          <ProtectedRoute>
            <ItemList />
          </ProtectedRoute>
        } />
        <Route path="/items/:id" element={
          <ProtectedRoute>
            <ItemDetail />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <RoleDashboard />
          </ProtectedRoute>
        } />
        <Route path="/report" element={
          <ProtectedRoute>
            <ReportItem />
          </ProtectedRoute>
        } />
        <Route path="/matches" element={
          <ProtectedRoute>
            <Matches />
          </ProtectedRoute>
        } />
        <Route path="/matches/:id" element={
          <ProtectedRoute>
            <MatchDetail />
          </ProtectedRoute>
        } />
        <Route path="/report/:itemId/result" element={
          <ProtectedRoute>
            <ReportResult />
          </ProtectedRoute>
        } />
        <Route path="/chat/:chatId" element={
          <ProtectedRoute>
            <ChatView />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute roles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/users/:id" element={
          <ProtectedRoute roles={['admin']}>
            <UserDetail />
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute roles={['admin']}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/admin/received" element={
          <ProtectedRoute roles={['admin']}>
            <ReceivedItems />
          </ProtectedRoute>
        } />
        <Route path="/admin/lost-found" element={
          <ProtectedRoute roles={['admin']}>
            <LostFoundUsers />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminDashboard />;
  return <UserDashboard />;
}
