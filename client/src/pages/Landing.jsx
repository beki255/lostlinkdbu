import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  FiSearch, FiShield, FiMessageCircle, FiCamera, 
  FiArrowRight, FiCheck, FiMail, FiPhone, FiMapPin,
  FiInfo, FiHelpCircle, FiSend
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import { publicApi } from '../services/api';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [cmsData, setCmsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refs for animations
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const howItWorksRef = useRef(null);
  const aboutRef = useRef(null);
  const contactRef = useRef(null);
  const gridCardsRef = useRef([]);

  useEffect(() => {
    const fetchCms = async () => {
      try {
        const res = await publicApi.getCmsPage('landing-page');
        setCmsData(res.data?.page?.metadata || null);
      } catch (err) {
        console.error('Failed to fetch landing page CMS data');
      } finally {
        setLoading(false);
      }
    };
    fetchCms();
  }, []);

  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      // Hero Entrance
      const heroTl = gsap.timeline();
      heroTl.from('.hero-content > *', {
        opacity: 0,
        y: 40,
        duration: 1,
        stagger: 0.2,
        ease: 'power4.out'
      });


      // Fade-in sections
      const sections = ['.section-reveal'];
      sections.forEach((selector) => {
        gsap.utils.toArray(selector).forEach((section) => {
          gsap.from(section, {
            opacity: 0,
            y: 60,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none none'
            }
          });
        });
      });

      // About Section Parallax Image
      gsap.to('.about-image', {
        y: -50,
        ease: 'none',
        scrollTrigger: {
          trigger: aboutRef.current,
          scrub: true
        }
      });

    }, containerRef);

    return () => ctx.revert();
  }, [loading]);

  const defaultContent = {
    hero: {
      title: "Lost Something?",
      subtitle: "We Help You Find It.",
      description: "LostLink DBU is your campus companion — report, search, and reclaim lost items with automated matching and secure verification."
    },
    steps: [
      { icon: FiCamera, title: "Report It", desc: "Snap a photo and describe the item you lost or found." },
      { icon: FiSearch, title: "Smart Search", desc: "Our smart algorithms scan for potential matches instantly." },
      { icon: FiMessageCircle, title: "Connect", desc: "Chat securely with the other party to arrange a return." },
      { icon: FiShield, title: "Recover", desc: "Safe handover with secure verification protocols." }
    ],
    about: {
      title: "Reuniting Communities",
      content: "We believe in the power of community and technology. LostLink was built to streamline the recovery process at Debre Berhan University, reducing stress and increasing recovery rates through intelligent automation.",
      stats: [
        { label: "Items Recovered", value: "1,200+" },
        { label: "Success Rate", value: "94%" },
        { label: "Campus Users", value: "5,000+" }
      ]
    },
    contact: {
      email: "lostlinkdbu@gmail.com",
      phone: "+251 11 123 4567",
      location: "Main Campus, Admin Building, Room 204"
    }
  };

  const content = cmsData || defaultContent;

  return (
    <div ref={containerRef} className="bg-white dark:bg-gray-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-6 py-4 backdrop-blur-md bg-white/70 dark:bg-dbu-navy/70 border-b border-dbu-blue/10 transition-all">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <img src="/dbuicon.png" alt="DBU Logo" className="h-10 w-auto group-hover:scale-110 transition-transform duration-300" />
            <span className="font-black text-2xl text-dbu-navy dark:text-dbu-blue tracking-tighter uppercase">{t('app.name')}</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">Home</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">How It Works</a>
            <a href="#about" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">About Us</a>
            <a href="#contact" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">Contact</a>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle className="hover:bg-gray-100 dark:hover:bg-gray-800" />
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary py-2 px-5 text-sm rounded-full shadow-lg hover:shadow-primary-500/30">Dashboard</Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600">Login</Link>
                <Link to="/register" className="btn-primary py-2 px-5 text-sm rounded-full shadow-lg hover:shadow-primary-500/30">Join Now</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-slate-50 dark:bg-gray-950">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-dbu-blue/10 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-dbu-gold/10 rounded-full blur-[120px] -ml-48 -mb-48" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="hero-content">
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-dbu-blue/10 text-dbu-blue dark:text-dbu-blue text-xs font-black uppercase tracking-widest mb-10 border border-dbu-blue/20">
              <span className="w-2 h-2 rounded-full bg-dbu-blue animate-pulse" />
              Revolutionizing Campus Recovery
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-dbu-navy dark:text-white mb-6 leading-[1.1] tracking-tighter">
              {content.hero.title}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-dbu-blue to-dbu-gold">
                {content.hero.subtitle}
              </span>
            </h1>
            <p className="text-xl text-dbu-navy/70 dark:text-dbu-blue/60 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              {content.hero.description}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link to="/register" className="group btn-primary px-12 py-5 rounded-2xl text-lg shadow-2xl hover:shadow-dbu-blue/40 flex items-center gap-4 transition-all hover:scale-105 active:scale-95">
                Start Recovering <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/items" className="px-12 py-5 rounded-2xl border-2 border-dbu-gold text-dbu-navy dark:text-dbu-gold font-black text-lg hover:bg-dbu-gold/10 transition-all flex items-center gap-4 active:scale-95">
                <FiSearch /> Browse Map
              </Link>
            </div>
          </div>
        </div>

        {/* The floating cards are now integrated into the grid below with scroll transitions */}
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" ref={howItWorksRef} className="py-32 relative bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">Simple. Secure. Smart.</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Our automated workflow takes the guesswork out of recovery.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-30">
            {content.steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div 
                  key={i} 
                  ref={el => gridCardsRef.current[i] = el}
                  className="group p-10 bg-dbu-beige-light dark:bg-dbu-navy/50 rounded-[3rem] hover:bg-white dark:hover:bg-dbu-navy transition-all duration-500 hover:shadow-2xl hover:shadow-dbu-blue/10 border border-transparent hover:border-dbu-blue/20"
                >
                  <div className="w-16 h-16 bg-dbu-blue text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-dbu-navy dark:text-white mb-4 tracking-tight">{step.title}</h3>
                  <p className="text-dbu-navy/60 dark:text-dbu-blue/60 leading-relaxed font-medium">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" ref={aboutRef} className="py-32 bg-slate-50 dark:bg-gray-950 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative section-reveal">
              <div className="about-image relative z-10 rounded-[3rem] overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop" 
                  alt="Students collaborating" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-primary-600 rounded-[3rem] -z-10 blur-[80px] opacity-20" />
              <div className="absolute top-10 -left-10 p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl z-20 border border-gray-100 dark:border-gray-700 hidden sm:block">
                <div className="text-4xl font-black text-primary-600 mb-1">94%</div>
                <div className="text-sm font-bold text-gray-500">Recovery Rate</div>
              </div>
            </div>

            <div className="section-reveal">
              <div className="inline-flex items-center gap-2 text-primary-600 font-bold mb-6">
                <FiInfo className="w-5 h-5" /> About Our Mission
              </div>
              <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-8 tracking-tight leading-tight">
                {content.about.title}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 leading-relaxed">
                {content.about.content}
              </p>
              
              <div className="grid grid-cols-3 gap-8">
                {content.about.stats.map((stat, i) => (
                  <div key={i}>
                    <div className="text-3xl font-black text-gray-900 dark:text-white mb-2">{stat.value}</div>
                    <div className="text-sm font-medium text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" ref={contactRef} className="py-32 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="section-reveal">
              <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Get in Touch</h2>
              <p className="text-xl text-gray-500 dark:text-gray-400 mb-12">
                Have questions or need assistance? Our team is here to help you reunite with your belongings.
              </p>

              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                    <FiMail className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Email Us</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">lostlinkdbu@gmail.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-green-600">
                    <FiPhone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Call Us</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{content.contact.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600">
                    <FiMapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Find Us</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{content.contact.location}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="section-reveal">
              <div className="p-10 bg-slate-50 dark:bg-gray-800/50 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-xl">
                <form className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                      <input type="text" className="input-field bg-white dark:bg-gray-900" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                      <input type="email" className="input-field bg-white dark:bg-gray-900" placeholder="john@dbu.edu.et" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                    <input type="text" className="input-field bg-white dark:bg-gray-900" placeholder="How can we help?" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Message</label>
                    <textarea className="input-field bg-white dark:bg-gray-900 min-h-[150px] pt-4" placeholder="Your message here..."></textarea>
                  </div>
                  <button type="button" className="w-full btn-primary py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary-500/20">
                    Send Message <FiSend className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <Link to="/" className="flex items-center space-x-3 mb-8">
                <img src="/dbuicon.png" alt="DBU Logo" className="h-12 w-auto" />
                <span className="font-black text-3xl tracking-tighter uppercase text-dbu-blue">LostLink</span>
              </Link>
              <p className="text-gray-400 text-lg leading-relaxed max-w-sm mb-8">
                The most advanced lost and found management system for modern universities.
              </p>
              <div className="flex gap-4">
                {/* Social icons could go here */}
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6">Quick Links</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="#home" className="hover:text-primary-500 transition-colors">Home</a></li>
                <li><a href="#how-it-works" className="hover:text-primary-500 transition-colors">Process</a></li>
                <li><a href="#about" className="hover:text-primary-500 transition-colors">Our Mission</a></li>
                <li><a href="#contact" className="hover:text-primary-500 transition-colors">Contact Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Resources</h4>
              <ul className="space-y-4 text-gray-400">
                <li><Link to="/items" className="hover:text-primary-500 transition-colors">Browse Items</Link></li>
                <li><Link to="/login" className="hover:text-primary-500 transition-colors">Student Login</Link></li>
                <li><Link to="/register" className="hover:text-primary-500 transition-colors">Get Started</Link></li>
                <li><Link to="/faq" className="hover:text-primary-500 transition-colors">Help Center</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-gray-500 text-sm">
              &copy; 2018 University Lost & Found Management System. All rights reserved.
            </p>
            <div className="flex gap-8 text-sm text-gray-500">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
