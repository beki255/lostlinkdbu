import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth as authApi } from '../../services/api';
import { FiLock, FiCheckCircle, FiArrowRight, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const { completeAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { email, otp } = location.state || {};

  useEffect(() => {
    if (!email || !otp) {
      navigate('/forgot-password');
    }
  }, [email, otp, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (formData.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        email,
        otp,
        password: formData.password,
      });
      toast.success('Password reset successfully! Welcome back.');
      completeAuth(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen h-screen flex items-center justify-center relative overflow-hidden bg-dbu-navy">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[15000ms] hover:scale-110"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-dbu-navy/95 via-dbu-navy/80 to-transparent backdrop-blur-[4px]"></div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-dbu-blue/10 rounded-full blur-[150px] -mr-64 -mt-64 z-0"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-dbu-gold/5 rounded-full blur-[150px] -ml-64 -mb-64 z-0"></div>

      <div className="relative z-10 w-full max-w-lg px-6">
        <div className="bg-white/10 dark:bg-black/40 backdrop-blur-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-dbu-gold/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-dbu-blue/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <FiLock className="w-12 h-12 text-dbu-blue" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">New Credentials</h1>
            <p className="text-slate-300 font-medium leading-relaxed">Security first! Choose a strong password for your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <FiShield className="w-4 h-4 text-dbu-blue" /> Choose Password
              </label>
              <input
                type="text"
                name="username"
                value={email || ''}
                autoComplete="username"
                className="hidden"
                readOnly
              />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all backdrop-blur-md"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <FiCheckCircle className="w-4 h-4 text-dbu-blue" /> Repeat Password
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all backdrop-blur-md"
                placeholder="••••••••"
              />
            </div>

            <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-3 backdrop-blur-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Security Check:</p>
              <ul className="text-xs text-slate-300 space-y-2 font-medium">
                <li className="flex items-center gap-3"><FiCheckCircle className="text-dbu-green" /> Minimum 8 characters long</li>
                <li className="flex items-center gap-3"><FiCheckCircle className="text-dbu-green" /> Mix of letters and numbers</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-dbu-blue hover:bg-dbu-blue/90 text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-dbu-blue/30 flex items-center justify-center gap-3 group transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Updating Password...</span>
                </div>
              ) : (
                <>
                  Save Changes <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
