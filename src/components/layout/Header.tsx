import React from 'react';
import { Bell, Search, User, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
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
        
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 hidden sm:block">Admin User</span>
          <div className="bg-gray-200 rounded-full p-2">
            <User size={20} className="text-gray-600" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;