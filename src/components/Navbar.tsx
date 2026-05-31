import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Bell, Settings, User } from 'lucide-react';
import logo from '../assets/CHIL_LOGO.png';

export const Navbar: React.FC = () => {
  return (
    <nav className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between font-sans">
      <div className="flex items-center h-full">
        {/* Logo */}
        <Link to="/lotes" className="flex items-center mr-8 hover:opacity-95 transition-opacity">
          <img src={logo} alt="Chil Logo" className="h-8 w-auto mr-2" />
          <div className="text-primary font-bold text-xl">
            Chil
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex h-full space-x-6">
          <NavLink
            to="/lotes/nuevo"
            className={({ isActive }) =>
              `flex items-center h-full px-1 border-b-2 transition-all font-semibold ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral hover:text-primary'
              }`
            }
          >
            Nuevo lote
          </NavLink>
          <NavLink
            to="/lotes"
            end
            className={({ isActive }) =>
              `flex items-center h-full px-1 border-b-2 transition-all font-semibold ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral hover:text-primary'
              }`
            }
          >
            Listado de lotes
          </NavLink>
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

