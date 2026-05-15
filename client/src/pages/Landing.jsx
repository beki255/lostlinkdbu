import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiShield, FiMessageCircle, FiCamera, FiArrowRight, FiCheck } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  { icon: FiSearch, title: 'AI-Powered Matching', desc: 'Smart algorithms match lost items with found reports automatically.' },
  { icon: FiCamera, title: 'Image Recognition', desc: 'Upload photos and let AI identify and match your items.' },
  { icon: FiShield, title: 'Secure Verification', desc: 'Multi-step verification ensures items return to rightful owners.' },
  { icon: FiMessageCircle, title: 'Anonymous Chat', desc: 'Communicate securely without exposing personal contact details.' },
];

export default function Landing() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const statsRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-title', { opacity: 0, y: 60, duration: 1, ease: 'power3.out' });
      gsap.from('.hero-subtitle', { opacity: 0, y: 30, duration: 1, delay: 0.3, ease: 'power3.out' });
      gsap.from('.hero-cta', { opacity: 0, y: 20, duration: 0.8, delay: 0.6, ease: 'power3.out' });

      if (featuresRef.current) {
        gsap.from('.feature-card', {
          opacity: 0, y: 50, duration: 0.8, stagger: 0.2, ease: 'power3.out',
          scrollTrigger: { trigger: featuresRef.current, start: 'top 80%' },
        });
      }

      gsap.from('.stat-item', {
        opacity: 0, y: 40, duration: 0.8, stagger: 0.15, ease: 'power3.out',
        scrollTrigger: { trigger: statsRef.current, start: 'top 85%' },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-bold text-xl text-white">{t('app.name')}</span>
          </Link>
          <div className="flex items-center space-x-4">
            <button onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'am' : 'en')}
              className="text-white/80 hover:text-white text-sm font-medium px-3 py-1.5 bg-white/10 rounded-lg">
              {i18n.language === 'en' ? 'አማርኛ' : 'English'}
            </button>
            {isAuthenticated ? (
              <Link to="/dashboard" className="bg-white text-primary-600 px-5 py-2 rounded-xl font-medium text-sm hover:bg-gray-100 transition">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="text-white/80 hover:text-white text-sm font-medium">Sign In</Link>
                <Link to="/register" className="bg-white text-primary-600 px-5 py-2 rounded-xl font-medium text-sm hover:bg-gray-100 transition">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="relative min-h-screen flex items-center bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-32 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full text-white/80 text-sm mb-8">
            <FiCheck className="w-4 h-4 mr-2" /> University Lost & Found System
          </div>
          <h1 className="hero-title text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Lost Something?<br />
            <span className="text-primary-200">We Help You Find It.</span>
          </h1>
          <p className="hero-subtitle text-xl text-white/70 max-w-2xl mx-auto mb-10">
            LostLink DBU is your intelligent campus companion — report, search, and reclaim lost items with AI-powered matching and secure verification.
          </p>
          <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="bg-white text-primary-600 px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all shadow-xl flex items-center gap-2">
              Get Started <FiArrowRight />
            </Link>
            <Link to="/items" className="border-2 border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all flex items-center gap-2">
              <FiSearch /> Browse Items
            </Link>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
            {[
              { value: '500+', label: 'Items Returned' },
              { value: '98%', label: 'Recovery Rate' },
              { value: '2K+', label: 'Active Users' },
            ].map((s) => (
              <div key={s.label} className="stat-item text-white">
                <div className="text-3xl font-bold">{s.value}</div>
                <div className="text-sm text-white/60">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={featuresRef} className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Smart technology meets campus community to reunite you with your belongings.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="feature-card card hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={statsRef} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Trusted by the Campus Community</h2>
          <p className="text-gray-600 mb-12">Join thousands of students and staff using LostLink DBU</p>
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <span>Made with ❤️ for the university community</span>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>&copy; {new Date().getFullYear()} LostLink DBU. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
