import { useState, useEffect } from 'react';
import { Network, TrendingUp, ArrowRightLeft, Image } from 'lucide-react';
import DAOMindMap from './components/DAOMindMap';
import DeFiMindMap from './components/DeFiMindMap';
import TradeMindMap from './components/TradeMindMap';
import NFTMindMap from './components/NFTMindMap';
import MW3Logo from '/MW3-LOGO-black.svg';

type Section = 'dao' | 'defi' | 'trade' | 'nft' | null;

function App() {
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [buttonsLoaded, setButtonsLoaded] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    // Reset states for initial loading
    setIsLoading(true);
    setLogoLoaded(false);
    setButtonsLoaded(false);
    setIsReturning(false);
    
    // Initial loading sequence
    const timer1 = setTimeout(() => setLogoLoaded(true), 300);
    const timer2 = setTimeout(() => setButtonsLoaded(true), 800);
    const timer3 = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const handleSectionClick = (sectionId: Section) => {
    if (activeSection && sectionId === null) {
      // Returning to main page - trigger return animation
      setIsReturning(true);
      setLogoLoaded(false);
      setButtonsLoaded(false);
      
      // Re-animate elements after a brief delay
      setTimeout(() => setLogoLoaded(true), 300);
      setTimeout(() => setButtonsLoaded(true), 800);
      setTimeout(() => setIsReturning(false), 1500);
    }
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  const sections = [
    { id: 'dao' as const, label: 'DAO', icon: Network, angle: 0 },
    { id: 'defi' as const, label: 'DeFi', icon: TrendingUp, angle: 90 },
    { id: 'trade' as const, label: 'Trade', icon: ArrowRightLeft, angle: 180 },
    { id: 'nft' as const, label: 'NFT', icon: Image, angle: 270 }
  ];


  const renderMindMap = () => {
    switch (activeSection) {
      case 'dao':
        return <DAOMindMap onClose={() => handleSectionClick(null)} />;
      case 'defi':
        return <DeFiMindMap onClose={() => handleSectionClick(null)} />;
      case 'trade':
        return <TradeMindMap onClose={() => handleSectionClick(null)} />;
      case 'nft':
        return <NFTMindMap onClose={() => handleSectionClick(null)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white text-black overflow-hidden relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, black 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Main Content */}
      <div className={`relative z-10 min-h-screen transition-all duration-1000 ease-in-out ${
        activeSection ? 'scale-90 opacity-20' : 'scale-100 opacity-100'
      } ${isLoading || isReturning ? 'pointer-events-none' : ''}`}>
        {/* Header */}
        <div className={`pt-12 text-center transition-all duration-1000 ${
          isLoading || isReturning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
        }`}>
          <div className="text-xs tracking-[0.4em] text-gray-600 mb-2 font-light">
            DECENTRALIZED ECOSYSTEM
          </div>
          <div className="w-24 h-px bg-black mx-auto opacity-20" />
        </div>

        {/* Central Logo with Circular Navigation */}
        <div className="flex items-center justify-center h-[70vh] relative">
          {/* Central MW3 Logo */}
          <div className="text-center group cursor-pointer relative z-20">
            <div className={`mb-4 transform transition-all duration-1000 ease-out select-none ${
              logoLoaded 
                ? 'scale-100 opacity-100 rotate-0' 
                : 'scale-0 opacity-0 rotate-180'
            }`}>
              <img 
                src={MW3Logo} 
                alt="MW3 Logo" 
                className="w-48 h-48 md:w-64 md:h-64 mx-auto drop-shadow-2xl"
              />
            </div>
            <div className={`text-sm tracking-[0.5em] text-gray-500 font-light transition-all duration-700 delay-500 ${
              logoLoaded 
                ? 'opacity-0 group-hover:opacity-100' 
                : 'opacity-0'
            }`}>
              META WEB 3.0
            </div>
          </div>

          {/* Circular Navigation Buttons */}
          {sections.map((section, index) => {
            const radius = 200; // Distance from center
            const angleRad = (section.angle * Math.PI) / 180;
            const x = Math.cos(angleRad) * radius;
            const y = Math.sin(angleRad) * radius;

            return (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={`absolute group transition-all duration-1000 ease-out hover:scale-110 ${
                  activeSection === section.id ? 'scale-110' : ''
                } ${
                  buttonsLoaded 
                    ? 'opacity-100 scale-100' 
                    : 'opacity-0 scale-0'
                }`}
                style={{
                  transform: buttonsLoaded 
                    ? `translate(${x}px, ${y}px)` 
                    : 'translate(0px, 0px)',
                  transitionDelay: `${index * 150 + 200}ms`
                }}
              >
                <div className="relative">
                  {/* Button Circle */}
                  <div className="w-20 h-20 rounded-full border-2 border-black bg-white hover:bg-black hover:text-white transition-all duration-500 flex items-center justify-center shadow-lg hover:shadow-2xl">
                    <section.icon className="w-8 h-8 transition-colors duration-300" />
                  </div>
                  
                  {/* Label */}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {section.label}
                  </div>

                  {/* Connection Line to Center */}
                  <div 
                    className="absolute top-1/2 left-1/2 origin-left h-px bg-black opacity-10 group-hover:opacity-30 transition-opacity duration-500"
                    style={{
                      width: `${radius}px`,
                      transform: `translate(-50%, -50%) rotate(${section.angle + 180}deg)`
                    }}
                  />

                  {/* Orbital Ring */}
                  <div className="absolute inset-0 rounded-full border border-black opacity-0 group-hover:opacity-20 animate-pulse" 
                       style={{ width: '120%', height: '120%', left: '-10%', top: '-10%' }} />
                </div>
              </button>
            );
          })}

          {/* Outer Decorative Ring */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-2000 ${
            buttonsLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}>
            <div className={`w-[500px] h-[500px] rounded-full border border-black opacity-5 transition-all duration-1500 ${
              buttonsLoaded ? 'animate-pulse' : ''
            }`} />
            <div className={`absolute w-[600px] h-[600px] rounded-full border border-black opacity-3 transition-all duration-2000 ${
              buttonsLoaded ? 'animate-spin-slow' : ''
            }`} />
          </div>
        </div>

        {/* Footer */}
        <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center transition-all duration-1000 delay-1000 ${
          isLoading || isReturning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
        }`}>
          <div className="text-xs text-gray-400 tracking-wider font-light">
            Click any section to explore the ecosystem
          </div>
        </div>
      </div>

      {/* Loading Screen Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
          <div className="text-center">
            {/* Loading Spinner */}
            <div className="relative mb-8">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-gray-300 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            
            {/* Loading Text */}
            <div className="space-y-2">
              <div className="text-lg font-light tracking-wider text-gray-600 animate-pulse">
                INITIALIZING
              </div>
              <div className="text-xs text-gray-400 tracking-[0.3em]">
                META WEB 3.0
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mind Map Overlay */}
      {activeSection && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className={`absolute inset-0 transition-all duration-1000 ${
            isReturning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}>
            {renderMindMap()}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;