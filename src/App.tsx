import { Suspense, useEffect, useRef, useState } from 'react';
import HomeHub from './components/home/HomeHub';
import SectionOverlay from './components/layout/SectionOverlay';
import { sectionComponents } from './sections/sectionRegistry';
import type { SectionId } from './types/section';
import ShareView from './components/profit/ShareView';

function SectionLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const animationTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [buttonsLoaded, setButtonsLoaded] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setLogoLoaded(false);
    setButtonsLoaded(false);
    setIsReturning(false);

    const timer1 = setTimeout(() => setLogoLoaded(true), 300);
    const timer2 = setTimeout(() => setButtonsLoaded(true), 800);
    const timer3 = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  useEffect(() => {
    return () => {
      animationTimers.current.forEach(clearTimeout);
      animationTimers.current = [];
    };
  }, []);

  const playReturnHomeAnimation = () => {
    animationTimers.current.forEach(clearTimeout);
    animationTimers.current = [];
    setIsReturning(true);
    setLogoLoaded(false);
    setButtonsLoaded(false);
    animationTimers.current.push(
      setTimeout(() => setLogoLoaded(true), 300),
      setTimeout(() => setButtonsLoaded(true), 800),
      setTimeout(() => setIsReturning(false), 1500)
    );
  };

  const handleHubSectionClick = (sectionId: SectionId) => {
    setActiveSection((prev) => (prev === sectionId ? null : sectionId));
  };

  const handleCloseMindMap = () => {
    if (activeSection) {
      playReturnHomeAnimation();
    }
    setActiveSection(null);
  };

  const ActiveMindMap = activeSection ? sectionComponents[activeSection] : null;

  const shareId = (() => {
    if (typeof window === 'undefined') return null;
    const m = window.location.pathname.match(/\/share\/([^/]+)/);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  })();

  if (shareId) {
    return (
      <ShareView
        shareId={shareId}
        onClose={() => {
          window.location.href = import.meta.env.BASE_URL;
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-black overflow-hidden relative">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, black 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <HomeHub
        activeSection={activeSection}
        isLoading={isLoading}
        isReturning={isReturning}
        logoLoaded={logoLoaded}
        buttonsLoaded={buttonsLoaded}
        onSectionClick={handleHubSectionClick}
      />

      <SectionOverlay open={activeSection !== null} isReturning={isReturning}>
        {ActiveMindMap && (
          <Suspense fallback={<SectionLoadingFallback />}>
            <ActiveMindMap onClose={handleCloseMindMap} />
          </Suspense>
        )}
      </SectionOverlay>
    </div>
  );
}

export default App;
