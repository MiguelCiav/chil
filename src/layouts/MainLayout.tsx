import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/' || location.pathname === '/inicio';

  return (
    <div className="min-h-screen bg-primary/5 flex flex-col font-sans">
      {!isLandingPage && <Navbar />}
      <main className={`flex-1 ${isLandingPage ? 'p-4 sm:p-6 lg:p-8' : 'p-8'}`}>
        {children}
      </main>
    </div>
  );
};
