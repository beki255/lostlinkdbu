import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiMail, FiLock, FiArrowRight, FiCheckCircle, FiShield, FiBook } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      toast.success('Account created! Please verify your email.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen h-screen flex items-center justify-center relative overflow-hidden bg-dbu-navy">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[12000ms] hover:scale-110"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tl from-dbu-navy/90 via-dbu-navy/70 to-transparent backdrop-blur-[3px]"></div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-dbu-blue/10 rounded-full blur-[150px] -ml-64 -mt-64 z-0 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-dbu-gold/5 rounded-full blur-[150px] -mr-64 -mb-64 z-0"></div>

      <div className="relative z-10 w-full max-w-[1200px] px-6 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Brand & Visuals */}
        <div className="hidden lg:block space-y-10 animate-fade-in">
          <Link to="/" className="inline-flex items-center gap-4 group">
            <img src="/dbuicon.png" alt="DBU Logo" className="h-20 w-auto group-hover:scale-110 transition-transform duration-500" />
            <div className="flex flex-col">
              <span className="text-4xl font-black text-white tracking-tighter uppercase leading-none">LostLink</span>
              <span className="text-dbu-blue font-bold tracking-[0.2em] text-sm uppercase">Debre Berhan University</span>
            </div>
          </Link>
          <div className="space-y-8">
            <h2 className="text-5xl font-black text-white leading-tight">
              Start your journey <br />
              <span className="text-dbu-gold text-6xl">with us today.</span>
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {[
                { icon: FiShield, title: "Secure Platform", desc: "Your data and items are protected by campus-grade security." },
                { icon: FiCheckCircle, title: "Verified Identity", desc: "Every user is verified via their official university email." }
              ].map((item, i) => (
                <div key={i} className="flex gap-5 items-start bg-white/5 p-6 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                  <div className="w-12 h-12 bg-dbu-blue/20 rounded-2xl flex items-center justify-center text-dbu-blue shrink-0">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Register Card */}
        <div className="w-full max-w-lg mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-4">
              <img src="/dbuicon.png" alt="DBU Logo" className="h-12 w-auto" />
              <span className="text-2xl font-black text-white tracking-tighter uppercase">LostLink</span>
            </Link>
          </div>

          <div className="bg-white/10 dark:bg-black/40 backdrop-blur-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-dbu-blue/10 rounded-full blur-3xl -ml-16 -mt-16"></div>
            
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Create Account</h1>
              <p className="text-slate-300 font-medium text-lg">Join the campus recovery community</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                    <FiUser className="w-3 h-3 text-dbu-blue" /> Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                    <FiMail className="w-3 h-3 text-dbu-blue" /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all"
                    placeholder="name@dbu.edu.et"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                    <FiLock className="w-3 h-3 text-dbu-blue" /> Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                    <FiCheckCircle className="w-3 h-3 text-dbu-blue" /> Confirm
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-dbu-blue/20 focus:border-dbu-blue transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dbu-blue hover:bg-dbu-blue/90 text-white py-4.5 rounded-2xl font-black text-xl shadow-2xl shadow-dbu-blue/30 flex items-center justify-center gap-3 group transition-all active:scale-[0.98] mt-4"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <>
                    Join the Community <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8">
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <span className="relative px-4 bg-transparent text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Or Register with</span>
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
              <p className="text-slate-400 font-medium">
                Already a member?{' '}
                <Link to="/login" className="text-white font-black hover:text-dbu-gold transition-colors border-b-2 border-dbu-blue/20 ml-2">
                  Sign In Now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
