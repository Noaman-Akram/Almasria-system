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
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const translateRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if Google Translate is already loaded
    const checkGoogleTranslate = () => {
      if (window.google && window.google.translate) {
        initializeTranslate();
      } else {
        // Wait a bit and check again
        setTimeout(checkGoogleTranslate, 500);
      }
    };

    const initializeTranslate = () => {
      if (translateRef.current && window.google && window.google.translate) {
        try {
          new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'ar,en',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
            multilanguagePage: true
          }, translateRef.current);
          
          setIsLoaded(true);
          console.log('Google Translate initialized successfully');
        } catch (error) {
          console.error('Error initializing Google Translate:', error);
        }
      }
    };

    checkGoogleTranslate();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoaded) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Translate Button */}
      <button
        onClick={toggleDropdown}
        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        disabled={!isLoaded}
        title={isLoaded ? "Translate Page" : "Loading translator..."}
      >
        <Languages size={18} />
      </button>

      {/* Dropdown */}
      {isOpen && isLoaded && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 min-w-[140px]">
          <div ref={translateRef} id="google_translate_element"></div>
        </div>
      )}

      {/* CSS to style the Google Translate widget */}
      <style>{`
        /* Style the Google Translate widget when it appears in our dropdown */
        #google_translate_element .goog-te-gadget {
          display: block !important;
          font-family: inherit !important;
          font-size: 0 !important;
        }
        
        #google_translate_element .goog-te-combo {
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
        }
        
        #google_translate_element .goog-te-combo:hover {
          border-color: #9ca3af !important;
        }
        
        #google_translate_element .goog-te-combo:focus {
          outline: none !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
        }
        
        #google_translate_element .goog-te-gadget-simple {
          background: transparent !important;
          border: none !important;
          font-size: 0.875rem !important;
        }
        
        #google_translate_element .goog-te-gadget-icon {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default GoogleTranslate;