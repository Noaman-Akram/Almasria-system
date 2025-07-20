import React, { useEffect, useState, useRef } from 'react';
import { Languages } from 'lucide-react';

// Extend Window interface to include Google Translate types
declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

const GoogleTranslate: React.FC = () => {
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const translateElementRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Function to initialize Google Translate
    const initializeGoogleTranslate = () => {
      if (window.google && window.google.translate && translateElementRef.current) {
        try {
          new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'ar,en',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
            multilanguagePage: true
          }, translateElementRef.current);
          
          setIsGoogleLoaded(true);
          console.log('Google Translate initialized successfully');
        } catch (error) {
          console.error('Error initializing Google Translate:', error);
        }
      }
    };

    // Check if Google Translate is already loaded
    if (window.google && window.google.translate) {
      initializeGoogleTranslate();
    } else {
      // Wait for Google Translate to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.translate) {
          initializeGoogleTranslate();
          clearInterval(checkInterval);
        }
      }, 100);

      // Clear interval after 10 seconds to prevent infinite checking
      setTimeout(() => clearInterval(checkInterval), 10000);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleGoogleTranslate = () => {
    if (!isGoogleLoaded) return;
    
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Compact Custom Button that toggles Google Translate */}
      <button
        onClick={toggleGoogleTranslate}
        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        disabled={!isGoogleLoaded}
        title={isGoogleLoaded ? "Translate Page" : "Loading translator..."}
      >
        <Languages size={18} />
      </button>

      {/* Google Translate Element - Always present but conditionally visible */}
      <div 
        className={`absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 min-w-[140px] transition-all duration-200 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div 
          ref={translateElementRef}
          id="google_translate_element"
          className="google-translate-container"
        ></div>
      </div>

      {/* Enhanced CSS to style Google Translate when it appears */}
      <style>{`
        /* Show Google Translate elements when our dropdown is open */
        .google-translate-container .goog-te-gadget {
          display: block !important;
          font-family: inherit !important;
          font-size: 0 !important;
        }
        
        .google-translate-container .goog-te-combo {
          display: block !important;
          background: white !important;
          border: 1px solid #d1d5db !important;
          border-radius: 0.375rem !important;
          padding: 6px 8px !important;
          font-size: 0.875rem !important;
          color: #374151 !important;
          width: 100% !important;
          min-width: 120px !important;
          cursor: pointer !important;
          appearance: auto !important;
        }
        
        .google-translate-container .goog-te-combo:hover {
          border-color: #9ca3af !important;
        }
        
        .google-translate-container .goog-te-combo:focus {
          outline: none !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
        }
        
        .google-translate-container .goog-te-gadget-simple {
          background: transparent !important;
          border: none !important;
          font-size: 0.875rem !important;
          display: block !important;
        }
        
        .google-translate-container .goog-te-gadget-simple .goog-te-menu-value {
          color: #374151 !important;
          display: block !important;
        }
        
        .google-translate-container .goog-te-gadget-simple .goog-te-menu-value span {
          color: #374151 !important;
          display: inline !important;
        }
        
        .google-translate-container .goog-te-gadget-icon {
          display: none !important;
        }
        
        /* Style the dropdown options */
        .google-translate-container .goog-te-combo option {
          padding: 4px 8px !important;
          font-size: 0.875rem !important;
          color: #374151 !important;
          background: white !important;
        }

        /* Ensure the select element is fully functional */
        .google-translate-container select {
          pointer-events: auto !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        /* Override any global hiding of Google Translate elements when in our container */
        .google-translate-container * {
          visibility: visible !important;
          opacity: 1 !important;
          display: block !important;
        }

        .google-translate-container select,
        .google-translate-container option {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `}</style>
    </div>
  );
};

export default GoogleTranslate;