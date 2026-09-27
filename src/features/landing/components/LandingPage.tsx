import React from 'react';
import { HeroSection } from './HeroSection';
import { FeatureGridSection } from './FeatureGridSection';
import { WorkflowSection } from './WorkflowSection';
import { LandingFooter } from './LandingFooter';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen font-sans w-full overflow-x-hidden">
      {/* Hero Section spans full width */}
      <HeroSection />

      {/* Content Sections */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex flex-col">
        {/* Core Capabilities */}
        <FeatureGridSection />

        {/* How it Works / Workflow */}
        <WorkflowSection />

        {/* Public Footer */}
        <LandingFooter />
      </div>
    </div>
  );
};
