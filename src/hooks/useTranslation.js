import { useLanguage } from '../context/LanguageContext';

export const useTranslation = () => {
  const { translations, currentLanguage, isLoading } = useLanguage();

  // Get translation by key with fallback
  const t = (key, fallback = key) => {
    if (isLoading) return fallback;
    
    // Support nested keys like "common.buttons.save"
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback;
      }
    }
    
    return typeof value === 'string' ? value : fallback;
  };

  // Translate with interpolation: t('welcome.message', { name: 'John' })
  const tWithParams = (key, params = {}, fallback = key) => {
    let translation = t(key, fallback);
    
    // Replace {{param}} with actual values
    Object.entries(params).forEach(([param, value]) => {
      translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), value);
    });
    
    return translation;
  };

  return {
    t,
    tWithParams,
    currentLanguage,
    isLoading
  };
};