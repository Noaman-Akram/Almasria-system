import React from 'react';
import { Bell, Search, User, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../components/ui/button';
import GoogleTranslate from '../ui/GoogleTranslate';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="text-xl font-semibold text-gray-800 ml-2 sm:ml-0">
          {/* Dynamic page title could go here */}
        </div>
      </div>
      
      <div className="flex items-center space-x-3 sm:space-x-6">
        <div className="relative hidden sm:block">
          <input
            type="text"
            placeholder="Search..."
            className="py-2 pl-10 pr-4 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48 lg:w-64"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        
        <button className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 bg-red-500 rounded-full w-2 h-2"></span>
        </button>

        {/* Google Translate - positioned with proper spacing */}
        <div className="hidden sm:flex">
          <GoogleTranslate />
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-gray-700">
              {user?.email || 'Unknown User'}
            </div>
            <div className="text-xs text-gray-500">
              {user?.user_metadata?.role || 'User'}
            </div>
          </div>
          <div className="bg-gray-200 rounded-full p-2">
            <User size={20} className="text-gray-600" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700"
            title="Logout"
          >
            <LogOut size={16} />
          </Button>
        </div>

        {/* Mobile Google Translate */}
        <div className="sm:hidden">
          <GoogleTranslate />
        </div>
      </div>
    </header>
  );
};

export default Header;