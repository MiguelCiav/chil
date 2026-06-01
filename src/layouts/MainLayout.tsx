import React, { ReactNode } from 'react';
import { Navbar } from '../components/Navbar';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-primary/5 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
};
