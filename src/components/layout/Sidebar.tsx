import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, ChevronRight, ChevronLeft, FileText, Hammer, LogOut, Database, Calendar, Plus } from 'lucide-react';
import { NavItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const allNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: LayoutDashboard
  },
  {
    name: 'Customers',
    path: '/customers',
    icon: Users
  },
  {
    name: 'Sale Orders',
    path: '/orders/sale',
    icon: FileText
  },
  {
    name: 'Work Orders',
    path: '/orders/work',
    icon: Hammer
  },
  {
    name: 'Scheduling',
    path: '/scheduling',
    icon: Calendar
  },
  {
    name: 'Tables',
    path: '/tables',
    icon: Database
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings
  }
];

// Define which pages each role can access
const rolePermissions = {
  admin: ['/', '/customers', '/orders/sale', '/orders/work', '/scheduling', '/tables', '/settings'],
  sales: ['/', '/orders/sale', '/scheduling'], // Sales users can only access dashboard, sale orders, and scheduling
  user: ['/', '/orders/sale'] // Default users get minimal access
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const location = useLocation();
  const { signOut, userRole, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      localStorage.removeItem('dev_mode');
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Filter navigation items based on user role
  const getFilteredNavItems = (): NavItem[] => {
    const currentRole = userRole || 'user';
    const allowedPaths = rolePermissions[currentRole as keyof typeof rolePermissions] || rolePermissions.user;
    
    return allNavItems.filter(item => allowedPaths.includes(item.path));
  };

  const navItems = getFilteredNavItems();

  return (
    <aside 
      className={`bg-gray-900 text-white fixed inset-y-0 left-0 z-30
        transition-all duration-300 ease-in-out flex flex-col
        ${collapsed ? 'w-20' : 'w-64'} 
        lg:sticky lg:top-0 lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <div className="font-bold text-xl">Marble CRM</div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-full hover:bg-gray-700 transition-colors lg:block hidden"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-700 transition-colors lg:hidden"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto">
        <div className="sticky top-0">
          <ul className="py-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                            (item.path !== '/' && location.pathname.startsWith(item.path));
              const isWorkOrders = item.path === '/orders/work';
              const isSaleOrders = item.path === '/orders/sale';
              const canCreateNew = userRole === 'admin' || userRole === 'sales'; // Both admin and sales can create orders
              
              return (
                <li key={item.path} className="group flex items-center">
                  <Link 
                    to={item.path}
                    onClick={() => onClose()}
                    className={`flex items-center px-4 py-3 flex-1 relative ${
                      isActive
                        ? isWorkOrders
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    } transition-colors`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive && isWorkOrders ? 'text-green-200' : ''}`} />
                    {!collapsed && <span className="ml-4">{item.name}</span>}
                    {!collapsed && (isSaleOrders || (isWorkOrders && userRole === 'admin')) && canCreateNew && (
                      <div
                        className="ml-auto p-0.5 w-6 h-6 min-w-0 min-h-0 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 border bg-[#1f2937] border-[#374151] text-[#9ca3af] rounded-md cursor-pointer transition-colors duration-150 hover:bg-[#232b36] hover:border-[#4b5563] hover:text-[#d1d5db]"
                        title={`Add New ${isSaleOrders ? 'Sale' : 'Work'} Order`}
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isSaleOrders) {
                            navigate('/orders/sale/new');
                          } else if (isWorkOrders && userRole === 'admin') {
                            navigate('/orders/work/new');
                          }
                          onClose();
                        }}
                      >
                        <Plus size={14} />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-700 bg-gray-900">
        {!collapsed && (
          <div className="space-y-4">
            <div className="text-xs text-gray-400">
              <div>Version 1.0.4</div>
              <div className="mt-1">
                Role: <span className="text-blue-400 font-medium">{userRole || 'user'}</span>
              </div>
              <div className="mt-1 truncate">
                {user?.email}
              </div>
              <div className="mt-2 text-[10px] text-gray-500">
                Powered by AppVert
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center text-gray-300 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span className="ml-2">Logout</span>}
            </Button>
          </div>
        )}
        {collapsed && (
          <Button
            variant="outline"
            className="w-full flex items-center justify-center text-gray-300 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
