/* eslint-disable react-refresh/only-export-components -- registry exports lazy imports + types */
import { lazy, type ComponentType } from 'react';
import type { SectionId } from '../types/section';

export interface MindMapSectionProps {
  onClose: () => void;
}

const DAOMindMap = lazy(() => import('../components/DAOMindMap'));
const DeFiMindMap = lazy(() => import('../components/DeFiMindMap'));
const TradeMindMap = lazy(() => import('../components/TradeMindMap'));
const NFTMindMap = lazy(() => import('../components/NFTMindMap'));
const ProfitCalendarMindMap = lazy(() => import('../components/ProfitCalendarMindMap'));
const ArtMindMap = lazy(() => import('../components/ArtMindMap'));
const SocialMindMap = lazy(() => import('../components/social/SocialMindMap'));
const EventsMindMap = lazy(() => import('../components/events/EventsMindMap'));
const SocialNetworkMindMap = lazy(() => import('../components/social-network/SocialNetworkMindMap'));

export const sectionComponents: Record<
  SectionId,
  ComponentType<MindMapSectionProps>
> = {
  dao: DAOMindMap,
  defi: DeFiMindMap,
  trade: TradeMindMap,
  nft: NFTMindMap,
  profit: ProfitCalendarMindMap,
  art: ArtMindMap,
  social: SocialMindMap,
  events: EventsMindMap,
  network: SocialNetworkMindMap,
};
