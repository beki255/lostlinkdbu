import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth as authApi } from '../../services/api';
import { FiMail, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(120);
  const [resending, setResending] = useState(false);
  const { completeAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/login');
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) return toast.error('Please enter full code');
    
    setLoading(true);
    try {
      const res = await authApi.verifyEmail({ email, otp: otpString });
      toast.success('Email verified successfully! Welcome to LostLink.');
      completeAuth(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResending(true);
    try {
      await authApi.resendOtp({ email, type: 'email_verification' });
      toast.success('New code sent!');
      setTimer(120);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen h-screen flex items-center justify-center relative overflow-hidden bg-dbu-navy">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[12000ms] hover:scale-110"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1557683311-eac922347aa1?q=80&w=2029&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-dbu-navy/95 via-dbu-navy/80 to-transparent backdrop-blur-[4px]"></div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-dbu-blue/10 rounded-full blur-[150px] -ml-64 -mt-64 z-0"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-dbu-gold/5 rounded-full blur-[150px] -mr-64 -mb-64 z-0"></div>

      <div className="relative z-10 w-full max-w-xl px-6">
        <div className="bg-white/10 dark:bg-black/40 backdrop-blur-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-dbu-blue/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="w-24 h-24 bg-dbu-blue/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <FiMail className="w-12 h-12 text-dbu-blue" />
          </div>

          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Verify Email</h1>
          <p className="text-slate-400 mb-10">Enter the 6-digit code sent to <span className="text-white font-bold">{email}</span></p>

          <form onSubmit={handleVerify} className="space-y-10">
            <div className="grid grid-cols-6 gap-2 sm:gap-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-full aspect-[2/3] text-center text-2xl md:text-3xl font-black bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all"
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="text-sm font-bold text-slate-400">
                {timer > 0 ? (
                  <span>Resend code in <span className="text-primary-400">{formatTime(timer)}</span></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    <FiRefreshCw className={resending ? 'animate-spin' : ''} /> Resend Code
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dbu-blue hover:bg-dbu-blue/90 text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-dbu-blue/30 flex items-center justify-center gap-3 group transition-all"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <>
                    Verify & Activate <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
