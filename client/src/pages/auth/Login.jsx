import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiLock, FiArrowRight, FiCheckCircle, FiShield } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        toast.error(err.response.data.message);
        return navigate('/verify-email', { state: { email: err.response.data.email } });
      }
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen h-screen flex items-center justify-center relative overflow-hidden bg-dbu-navy">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10000ms] hover:scale-110"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1541339907198-e08756ebafe3?q=80&w=2070&auto=format&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-dbu-navy/90 via-dbu-navy/60 to-transparent backdrop-blur-[2px]"></div>
      </div>

      {/* Animated Light Trails */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-dbu-blue/20 rounded-full blur-[150px] -mr-64 -mt-64 z-0 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-dbu-gold/10 rounded-full blur-[150px] -ml-64 -mb-64 z-0"></div>

      <div className="relative z-10 w-full max-w-[1100px] px-6 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Brand & Visuals */}
        <div className="hidden lg:block space-y-8 animate-fade-in">
          <Link to="/" className="inline-flex items-center gap-4 group">
            <img src="/dbuicon.png" alt="DBU Logo" className="h-20 w-auto group-hover:scale-110 transition-transform duration-500" />
            <div className="flex flex-col">
              <span className="text-4xl font-black text-white tracking-tighter uppercase leading-none">LostLink</span>
              <span className="text-dbu-blue font-bold tracking-[0.2em] text-sm uppercase">Debre Berhan University</span>
            </div>
          </Link>
          <div className="space-y-6">
            <h2 className="text-5xl font-black text-white leading-tight">
              Reconnect with what <br />
              <span className="text-dbu-gold">you've lost.</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-md leading-relaxed">
              The campus's most secure and intelligent platform for managing lost and found belongings. Powered by community and technology.
            </p>
            <div className="flex gap-8 pt-4">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">5k+</span>
                <span className="text-sm font-bold text-dbu-blue">Active Students</span>
              </div>
              <div className="w-px h-12 bg-white/20"></div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">94%</span>
                <span className="text-sm font-bold text-dbu-blue">Success Rate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-4">
              <img src="/dbuicon.png" alt="DBU Logo" className="h-12 w-auto" />
              <span className="text-2xl font-black text-white tracking-tighter uppercase">LostLink</span>
            </Link>
          </div>

          <div className="bg-white/10 dark:bg-black/40 backdrop-blur-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-dbu-gold/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="mb-10">
              <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Welcome Back</h1>
              <p className="text-slate-300 font-medium">Please enter your credentials</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <FiMail className="w-3.5 h-3.5 text-dbu-blue" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all backdrop-blur-md"
                  placeholder="name@dbu.edu.et"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <FiLock className="w-3.5 h-3.5 text-dbu-blue" /> Password
                  </label>
                  <Link 
                    to="/forgot-password" 
                    state={{ email: formData.email }}
                    className="text-[10px] font-black uppercase text-dbu-gold hover:text-white transition-colors tracking-widest"
                  >
                    Forgot?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all backdrop-blur-md"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dbu-blue hover:bg-dbu-blue/90 text-white py-4.5 rounded-2xl font-black text-lg shadow-2xl shadow-dbu-blue/30 flex items-center justify-center gap-3 group transition-all active:scale-[0.98] mt-4"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <>
                    Sign In <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8">
              <div className="relative flex items-center justify-center mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <span className="relative px-4 bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Or continue with</span>
              </div>

              <button
                type="button"
                className="w-full bg-white text-slate-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                <FcGoogle className="w-6 h-6" />
                Google Account
              </button>
            </div>

            <div className="mt-10 text-center">
              <p className="text-slate-400 text-sm font-medium">
                Don't have an account?{' '}
                <Link to="/register" className="text-white font-black hover:text-dbu-gold transition-colors border-b-2 border-dbu-blue/20">
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
