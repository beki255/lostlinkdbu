import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth as authApi } from '../../services/api';
import { FiShield, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function VerifyOtp() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(120); // 2 minutes
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
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
    if (otpString.length < 6) return toast.error('Please enter full OTP');
    
    // We'll pass the email and OTP to the next step
    navigate('/reset-password', { state: { email, otp: otpString } });
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResending(true);
    try {
      await authApi.resendOtp({ email, type: 'password_reset' });
      toast.success('New OTP sent!');
      setTimer(120);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      toast.error(err.message || 'Failed to resend OTP');
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
      {/* Dynamic Background */}
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
            <FiShield className="w-12 h-12 text-dbu-blue" />
          </div>

          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Verify Identity</h1>
          <p className="text-slate-300 font-medium text-lg leading-relaxed mb-10">
            We've sent a 6-digit secure code to <br/>
            <span className="text-white font-black underline decoration-dbu-blue/50 underline-offset-4">{email}</span>
          </p>

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
                  className="w-full aspect-[2/3] text-center text-2xl md:text-4xl font-black bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all"
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                {timer > 0 ? (
                  <span>Wait <span className="text-dbu-blue">{formatTime(timer)}</span> for new code</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="flex items-center gap-2 text-dbu-gold hover:text-white transition-colors"
                  >
                    <FiRefreshCw className={resending ? 'animate-spin' : ''} /> Resend Access Key
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-dbu-blue hover:bg-dbu-blue/90 text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-dbu-blue/30 flex items-center justify-center gap-3 group transition-all active:scale-[0.98]"
              >
                Authorize Access <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
