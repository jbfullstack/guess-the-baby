import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

const Card = ({ 
  children, 
  className = '', 
  title = null,
  collapsedTitle = null, // Different title when collapsed
  collapsible = false,
  collapsibleOnlyOnMobile = false, // NEW: Only collapsible on mobile screens
  defaultExpanded = true,
  icon = null,
  ...props 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Use collapsedTitle when collapsed, otherwise use regular title
  const displayTitle = (!isExpanded && collapsedTitle) ? collapsedTitle : title;

  // Determine if collapse functionality should be active
  const isCollapsible = collapsible || collapsibleOnlyOnMobile;

  return (
    <motion.div
      className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {/* Header - only show if title provided or collapsible */}
      {(title || isCollapsible) && (
        <div 
          className={`flex items-center justify-between p-4 ${
            isCollapsible ? `cursor-pointer hover:bg-white/5 transition-colors rounded-t-xl ${
              collapsibleOnlyOnMobile ? 'lg:cursor-default lg:hover:bg-transparent' : ''
            }` : ''
          } ${children ? 'border-b border-white/10' : ''}`}
          onClick={isCollapsible ? toggleExpanded : undefined}
        >
          <div className="flex items-center space-x-2">
            {icon && (
              <div className="text-purple-400">
                {icon}
              </div>
            )}
            {displayTitle && (
              <h3 className="text-lg font-semibold text-white">
                {displayTitle}
              </h3>
            )}
          </div>
          
          {isCollapsible && (
            <motion.div
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.2 }}
              className={`text-gray-400 hover:text-white transition-colors ${
                collapsibleOnlyOnMobile ? 'lg:hidden' : ''
              }`}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          )}
        </div>
      )}

      {/* Content */}
      {collapsibleOnlyOnMobile ? (
        <>
          {/* Mobile: Collapsible version */}
          <div className="lg:hidden">
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ 
                    duration: 0.3,
                    ease: "easeInOut"
                  }}
                  className="overflow-hidden"
                >
                  <div className={title || isCollapsible ? "p-6 pt-4" : "p-6"}>
                    {children}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Desktop: Always visible */}
          <div className="hidden lg:block">
            <div className={title || isCollapsible ? "p-6 pt-4" : "p-6"}>
              {children}
            </div>
          </div>
        </>
      ) : (
        /* Normal behavior (always collapsible or never collapsible) */
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                duration: 0.3,
                ease: "easeInOut"
              }}
              className="overflow-hidden"
            >
              <div className={title || isCollapsible ? "p-6 pt-4" : "p-6"}>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}


    </motion.div>
  );
};

export default Card;