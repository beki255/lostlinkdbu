import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';
import am from './locales/am/translation.json';

const savedLang = localStorage.getItem('language') || 'en';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, am: { translation: am } },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export const changeLanguage = (lang) => {
  i18n.changeLanguage(lang);
  localStorage.setItem('language', lang);
};

export default i18n;
