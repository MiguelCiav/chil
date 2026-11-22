import React from 'react';
import { HeroSection } from './HeroSection';
import { FeatureGridSection } from './FeatureGridSection';
import { WorkflowSection } from './WorkflowSection';
import { LandingFooter } from './LandingFooter';

export const LandingPage: React.FC = () => {
  return (
    // overflow-x-clip (not hidden) keeps position: sticky working for the showcase stage
    <div className="flex flex-col min-h-screen font-sans w-full overflow-x-clip">
      {/* Split parchment hero banner */}
      <HeroSection />

      {/* Sticky product storytelling (Verifica, Diseña, Exporta, Analiza) */}
      <FeatureGridSection />

      {/* Scroll marquee, manifesto and product facts */}
      <WorkflowSection />

      {/* Dark closing call to action + footer */}
      <LandingFooter />
    </div>
  );
};
