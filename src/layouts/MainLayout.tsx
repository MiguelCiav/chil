import React, { ReactNode, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import logo from '../assets/CHIL_LOGO.png';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../features/auth';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isLandingPage = location.pathname === '/' || location.pathname === '/inicio';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(location.pathname);

  // Close mobile menu automatically on route change during render
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    setIsMobileMenuOpen(false);
  }

  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-primary/5 flex flex-col font-sans">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary/5 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Bar */}
      <header className="md:hidden h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-neutral/70 hover:text-neutral hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to={user ? "/lotes" : "/"} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img src={logo} alt="Chil Logo" className="h-7 w-7 object-contain" />
            <span className="text-primary font-bold text-lg tracking-tight">Chil</span>
          </Link>
        </div>
      </header>

      {/* Responsive Collapsible Sidebar */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};
