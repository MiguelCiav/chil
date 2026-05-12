import React from 'react';
import { Bell, Settings, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <nav className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between">
      <div className="flex items-center h-full">
        {/* Logo */}
        <div className="text-primary font-bold text-xl mr-8">
          Chil
        </div>
        
        {/* Navigation Links */}
        <div className="flex h-full space-x-6">
          <a
            href="#"
            className="flex items-center h-full px-1 border-b-2 border-primary text-primary font-medium transition-colors"
          >
            Nuevo lote
          </a>
          <a
            href="#"
            className="flex items-center h-full px-1 border-b-2 border-transparent text-neutral hover:text-primary font-medium transition-colors"
          >
            Listado de lotes
          </a>
        </div>
      </div>

      {/* Right Side Icons */}
      <div className="flex items-center space-x-4 text-neutral">
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button className="ml-2 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border border-gray-300">
          {/* Avatar Placeholder */}
          <User className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </nav>
  );
};
