import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
// Import the flag-icons CSS
import "flag-icons/css/flag-icons.min.css";

const LanguageSelector = ({ 
  className = '', 
  variant = 'default',
  showLabel = true,
  showFlag = true,
  showCode = false,
  flagFormat = 'square', // 'square' or 'rectangular'
  englishFlag = 'us' // 'us' or 'gb' - choose between US or UK flag for English
}) => {
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const currentLang = supportedLanguages[currentLanguage];

  // Flag mapping - you can easily add more languages here
  const flagMapping = {
    en: englishFlag, // 'us' or 'gb'
    fr: 'fr',        // France
    es: 'es',        // Spain  
    de: 'de',        // Germany
    it: 'it',        // Italy
    pt: 'pt',        // Portugal
    ru: 'ru',        // Russia
    ja: 'jp',        // Japan
    cn: 'cn',        // China
    kr: 'kr'         // South Korea
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (langCode) => {
    if (langCode === currentLanguage) {
      setIsOpen(false);
      return;
    }

    setIsAnimating(true);
    await changeLanguage(langCode);
    
    setTimeout(() => {
      setIsAnimating(false);
      setIsOpen(false);
    }, 150);
  };

  const renderFlag = (langCode, size = "default") => {
    if (!showFlag) return null;

    const flagCode = flagMapping[langCode] || langCode;
    const sizeClasses = {
      small: "text-sm",
      default: "text-base", 
      large: "text-lg"
    };

    const formatClass = flagFormat === 'square' ? 'fis' : '';

    return (
      <span 
        className={`fi fi-${flagCode} ${formatClass} ${sizeClasses[size]} inline-block`}
        style={{ 
          width: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
          height: size === 'small' ? '12px' : size === 'large' ? '18px' : '15px'
        }}
      />
    );
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-200 text-sm"
          disabled={isAnimating}
        >
          <div className="flex items-center justify-center w-4 h-3">
            {renderFlag(currentLanguage, "small")}
          </div>
          {showCode && <span className="font-medium">{currentLang?.code.toUpperCase()}</span>}
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div 
              ref={dropdownRef}
              className="absolute top-full right-0 mt-1 w-36 bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-lg shadow-xl z-20 overflow-hidden"
            >
              {Object.values(supportedLanguages).map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-700/50 transition-colors text-sm ${
                    currentLanguage === lang.code ? 'bg-purple-600/30 text-purple-300' : 'text-white'
                  }`}
                >
                  {renderFlag(lang.code, "small")}
                  <span className="font-medium">{lang.code.toUpperCase()}</span>
                  {currentLanguage === lang.code }
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-all duration-200"
          disabled={isAnimating}
        >
          {renderFlag(currentLanguage, "default")}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div 
              ref={dropdownRef}
              className="absolute top-full right-0 mt-2 bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-lg shadow-xl z-20 overflow-hidden"
            >
              {Object.values(supportedLanguages).map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center justify-center w-12 h-12 hover:bg-gray-700/50 transition-colors relative ${
                    currentLanguage === lang.code ? 'bg-purple-600/30' : ''
                  }`}
                  title={lang.name}
                >
                  {renderFlag(lang.code, "default")}
                  {currentLanguage === lang.code && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-purple-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200 shadow-lg group"
        disabled={isAnimating}
      >
        {/* Flag */}
        <div className="relative flex items-center justify-center w-5 h-4">
          {renderFlag(currentLanguage)}
          {isAnimating && (
            <div className="absolute inset-0 animate-pulse bg-white/20 rounded-sm" />
          )}
        </div>
        
        {/* Language info */}
        <div className="flex flex-col items-start">
          {showCode && (
            <span className="text-xs text-gray-300 leading-none">
              {currentLang?.code.toUpperCase()}
            </span>
          )}
          {showLabel && (
            <span className="text-sm font-medium leading-tight">
              {currentLang?.name}
            </span>
          )}
        </div>
        
        {/* Dropdown arrow */}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 group-hover:text-purple-300 ${
          isOpen ? 'rotate-180 text-purple-300' : ''
        }`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div 
            ref={dropdownRef}
            className="absolute top-full right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-lg shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {Object.values(supportedLanguages).map((lang, index) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-all duration-150 ${
                  currentLanguage === lang.code 
                    ? 'bg-purple-600/20 text-purple-300 border-l-2 border-purple-400' 
                    : 'text-white hover:text-purple-300'
                } ${index === 0 ? 'rounded-t-lg' : ''} ${
                  index === Object.values(supportedLanguages).length - 1 ? 'rounded-b-lg' : ''
                }`}
              >
                {/* Flag */}
                {renderFlag(lang.code)}
                
                {/* Language info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{lang.name}</span>
                      <div className="text-xs text-gray-400">
                        {lang.code.toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Current language indicator */}
                    {currentLanguage === lang.code && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                       
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;