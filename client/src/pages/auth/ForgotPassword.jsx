import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth as authApi } from '../../services/api';
import { FiMail, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      toast.success('OTP sent to your email');
      navigate('/verify-otp', { state: { email } });
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen h-screen flex items-center justify-center relative overflow-hidden bg-dbu-navy">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[15000ms] hover:scale-110"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-dbu-navy/95 via-dbu-navy/80 to-transparent backdrop-blur-[4px]"></div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-dbu-blue/10 rounded-full blur-[150px] -mr-64 -mt-64 z-0"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-dbu-gold/5 rounded-full blur-[150px] -ml-64 -mb-64 z-0"></div>

      <div className="relative z-10 w-full max-w-lg px-6">
        <div className="bg-white/10 dark:bg-black/40 backdrop-blur-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-dbu-gold/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

          <Link to="/login" className="inline-flex items-center text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-dbu-gold transition-colors mb-12 gap-2 group">
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Login
          </Link>
          
          <div className="mb-10">
            <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Recovery Access</h1>
            <p className="text-slate-300 font-medium text-lg leading-relaxed">Enter your registered email and we'll send a secure OTP to your inbox.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <FiMail className="w-4 h-4 text-dbu-blue" /> Institutional Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all backdrop-blur-md"
                placeholder="name@dbu.edu.et"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-dbu-blue hover:bg-dbu-blue/90 text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-dbu-blue/30 flex items-center justify-center gap-3 group transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Sending OTP...</span>
                </div>
              ) : (
                <>
                  Send OTP Code <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
