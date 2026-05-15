import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
let gsiInitialized = false;

export default function GoogleSignIn({ mode = 'login' }) {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef(null);
  const [scriptError, setScriptError] = useState(false);

  const handleCredentialResponse = useCallback(async (response) => {
    try {
      await googleLogin(response.credential);
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Google authentication failed. Please try again.');
    }
  }, [googleLogin, mode, navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const renderButton = () => {
      if (btnRef.current && typeof window.google?.accounts?.id !== 'undefined') {
        window.google.accounts.id.renderButton(btnRef.current, {
          type: 'standard',
          shape: 'rectangular',
          theme: 'outline',
          text: mode === 'login' ? 'signin_with' : 'signup_with',
          size: 'large',
          width: btnRef.current.offsetWidth || 320,
          logo_alignment: 'center',
        });
      }
    };

    if (gsiInitialized) {
      renderButton();
      return;
    }

    const initGIS = () => {
      if (typeof window.google === 'undefined') {
        setScriptError(true);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        cancel_on_tap_outside: false,
        auto_select: false,
      });

      gsiInitialized = true;
      renderButton();
    };

    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        initGIS();
      } else {
        existingScript.addEventListener('load', initGIS);
        existingScript.addEventListener('error', () => setScriptError(true));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      initGIS();
    };
    script.onerror = () => setScriptError(true);
    document.body.appendChild(script);

    return () => {
      if (typeof window.google?.accounts?.id !== 'undefined') {
        try {
          window.google.accounts.id.cancel();
        } catch {}
      }
    };
  }, [handleCredentialResponse, mode]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="w-full mt-4 text-center">
        <p className="text-xs text-gray-400">
          Google Sign-In not configured. Set <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> to enable.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-500">or continue with</span>
        </div>
      </div>

      {scriptError ? (
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
        >
          <FcGoogle className="w-5 h-5" />
          <span className="text-sm font-medium">Google Sign-In unavailable</span>
        </button>
      ) : (
        <div ref={btnRef} className="flex justify-center w-full min-h-[40px]" />
      )}
    </div>
  );
}
