import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './i18n';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ThemeProvider>
          <GoogleOAuthProvider clientId="3015331225-23re4ou881uv5q6ajeokgkatk0if9jcl.apps.googleusercontent.com">
            <App />
          </GoogleOAuthProvider>
          <Toaster position="top-right" toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', padding: '12px 16px' },
          }} />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
