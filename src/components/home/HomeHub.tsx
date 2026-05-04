import { ArrowRightLeft, CalendarRange, Clapperboard, Image, Network, TrendingUp } from 'lucide-react';
import type { SectionId } from '../../types/section';
import MW3Logo from '/MW3-LOGO-black.svg';

const sections: {
  id: SectionId;
  label: string;
  icon: typeof Network;
  angle: number;
}[] = [
  { id: 'dao', label: 'DAO', icon: Network, angle: 0 },
  { id: 'defi', label: 'DeFi', icon: TrendingUp, angle: 60 },
  { id: 'trade', label: 'Trade', icon: ArrowRightLeft, angle: 120 },
  { id: 'nft', label: 'NFT', icon: Image, angle: 180 },
  { id: 'profit', label: 'Profit', icon: CalendarRange, angle: 240 },
  { id: 'art', label: 'ART', icon: Clapperboard, angle: 300 },
];

interface HomeHubProps {
  activeSection: SectionId | null;
  isLoading: boolean;
  isReturning: boolean;
  logoLoaded: boolean;
  buttonsLoaded: boolean;
  onSectionClick: (sectionId: SectionId) => void;
}

export default function HomeHub({
  activeSection,
  isLoading,
  isReturning,
  logoLoaded,
  buttonsLoaded,
  onSectionClick,
}: HomeHubProps) {
  return (
    <>
      <div
        className={`relative z-10 min-h-screen transition-all duration-1000 ease-in-out ${
          activeSection ? 'scale-90 opacity-20' : 'scale-100 opacity-100'
        } ${isLoading || isReturning ? 'pointer-events-none' : ''}`}
      >
        <div
          className={`pt-12 text-center transition-all duration-1000 ${
            isLoading || isReturning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="text-xs tracking-[0.4em] text-gray-600 mb-2 font-light">
            DECENTRALIZED ECOSYSTEM
          </div>
          <div className="w-24 h-px bg-black mx-auto opacity-20" />
        </div>

        <div className="flex items-center justify-center h-[70vh] relative px-4 md:px-0">
          <div className="text-center group cursor-pointer relative z-20">
            <div
              className={`mb-4 transform transition-all duration-1000 ease-out select-none ${
                logoLoaded
                  ? 'scale-100 opacity-100 rotate-0'
                  : 'scale-0 opacity-0 rotate-180'
              }`}
            >
              <img
                src={MW3Logo}
                alt="MW3 Logo"
                className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-64 lg:h-64 mx-auto drop-shadow-2xl"
              />
            </div>
            <div
              className={`text-xs sm:text-sm tracking-[0.5em] text-gray-500 font-light transition-all duration-700 delay-500 ${
                logoLoaded ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
              }`}
            >
              META WEB 3.0
            </div>
          </div>

          {sections.map((section, index) => (
            <button
              type="button"
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className={`nav-button absolute group transition-all duration-1000 ease-out hover:scale-110 ${
                activeSection === section.id ? 'scale-110' : ''
              } ${
                buttonsLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
              }`}
              style={{
                transform: buttonsLoaded
                  ? `translate(calc(cos(${section.angle}deg) * var(--radius)), calc(sin(${section.angle}deg) * var(--radius)))`
                  : 'translate(0px, 0px)',
                transitionDelay: `${index * 150 + 200}ms`,
              }}
            >
              <div className="relative">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-2 border-black bg-white hover:bg-black hover:text-white transition-all duration-500 flex items-center justify-center shadow-lg hover:shadow-2xl">
                  <section.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 transition-colors duration-300" />
                </div>

                <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  {section.label}
                </div>

                <div
                  className="absolute top-1/2 left-1/2 origin-left h-px bg-black opacity-10 group-hover:opacity-30 transition-opacity duration-500"
                  style={{
                    width: 'var(--radius)',
                    transform: `translate(-50%, -50%) rotate(${section.angle + 180}deg)`,
                  }}
                />

                <div
                  className="absolute inset-0 rounded-full border border-black opacity-0 group-hover:opacity-20 animate-pulse"
                  style={{ width: '120%', height: '120%', left: '-10%', top: '-10%' }}
                />
              </div>
            </button>
          ))}

          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-2000 ${
              buttonsLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <div
              className={`w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] rounded-full border border-black opacity-5 transition-all duration-1500 ${
                buttonsLoaded ? 'animate-pulse' : ''
              }`}
            />
            <div
              className={`absolute w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] md:w-[600px] md:h-[600px] rounded-full border border-black opacity-3 transition-all duration-2000 ${
                buttonsLoaded ? 'animate-spin-slow' : ''
              }`}
            />
          </div>
        </div>

        <div
          className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center transition-all duration-1000 delay-1000 ${
            isLoading || isReturning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="text-xs text-gray-400 tracking-wider font-light">
            Click any section to explore the ecosystem
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />
              <div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-gray-300 rounded-full animate-spin mx-auto"
                style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
              />
            </div>

            <div className="space-y-2">
              <div className="text-lg font-light tracking-wider text-gray-600 animate-pulse">
                INITIALIZING
              </div>
              <div className="text-xs text-gray-400 tracking-[0.3em]">META WEB 3.0</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
