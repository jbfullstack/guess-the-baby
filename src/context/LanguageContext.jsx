import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

// Supported languages configuration (removed emoji flags)
export const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English'
  },
  fr: {
    code: 'fr', 
    name: 'Français',
    nativeName: 'Français'
  }
};

// Translation cache to avoid re-loading
const translationCache = {};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Get from localStorage or default to English
    return localStorage.getItem('gameLanguage') || 'en';
  });
  
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Load translations for a specific language
  const loadTranslations = async (languageCode) => {
    if (translationCache[languageCode]) {
      setTranslations(translationCache[languageCode]);
      return;
    }

    setIsLoading(true);
    try {
      // Dynamic import for better performance
      const translationModule = await import(`../translations/${languageCode}.js`);
      const loadedTranslations = translationModule.default;
      
      // Cache the translations
      translationCache[languageCode] = loadedTranslations;
      setTranslations(loadedTranslations);
      
      console.log(`✅ Loaded ${languageCode} translations:`, Object.keys(loadedTranslations));
    } catch (error) {
      console.error(`❌ Failed to load translations for ${languageCode}:`, error);
      // Fallback to English if available
      if (languageCode !== 'en' && translationCache.en) {
        setTranslations(translationCache.en);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Change language
  const changeLanguage = async (languageCode) => {
    if (SUPPORTED_LANGUAGES[languageCode]) {
      console.log(`🌍 Changing language to: ${languageCode}`);
      setCurrentLanguage(languageCode);
      localStorage.setItem('gameLanguage', languageCode);
      await loadTranslations(languageCode);
    }
  };

  // Load initial translations
  useEffect(() => {
    loadTranslations(currentLanguage);
  }, []);

  // Debug current state
  useEffect(() => {
    console.log('🎯 Language Context State:', {
      currentLanguage,
      availableTranslations: Object.keys(translations),
      isLoading
    });
  }, [currentLanguage, translations, isLoading]);

  const value = {
    currentLanguage,
    translations,
    isLoading,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};