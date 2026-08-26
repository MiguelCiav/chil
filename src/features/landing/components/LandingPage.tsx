import React from 'react';
import { HeroSection } from './HeroSection';
import { FeatureGridSection } from './FeatureGridSection';
import { WorkflowSection } from './WorkflowSection';
import { LandingFooter } from './LandingFooter';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] font-sans -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <HeroSection />

      {/* Core Capabilities */}
      <FeatureGridSection />

      {/* How it Works / Workflow */}
      <WorkflowSection />

      {/* Public Footer */}
      <LandingFooter />
    </div>
  );
};
