import React, { useState } from 'react';
import { X, Palette, Crown, Gem, Zap, Users, DollarSign, Shield, Star, Eye, Percent, Lock, BarChart2, TrendingUp, FileText, Award, ShoppingCart } from 'lucide-react';

interface NFTMindMapProps {
  onClose: () => void;
}

const NFTMindMap: React.FC<NFTMindMapProps> = ({ onClose }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const nodes = [
    // Core NFT Business ecosystem
    { id: 'digital-art', icon: Palette, label: 'Digital Art', x: 15, y: 15, size: 'large', connections: ['creation', 'marketplace', 'royalties'] },
    { id: 'digital-products', icon: ShoppingCart, label: 'Digital Products', x: 85, y: 15, size: 'large', connections: ['utility', 'licensing', 'distribution'] },
    { id: 'certification', icon: Award, label: 'Product Certification', x: 15, y: 85, size: 'large', connections: ['verification', 'tracking', 'authenticity'] },
    { id: 'marketplace', icon: Crown, label: 'NFT Marketplace', x: 85, y: 85, size: 'large', connections: ['trading', 'auctions', 'collections'] },
    
    // Digital Art ecosystem
    { id: 'creation', icon: Star, label: 'Art Creation', x: 25, y: 30, size: 'medium', connections: ['digital-art', 'minting'] },
    { id: 'minting', icon: Gem, label: 'Minting', x: 35, y: 20, size: 'small', connections: ['creation', 'metadata'] },
    { id: 'metadata', icon: FileText, label: 'Metadata', x: 15, y: 35, size: 'small', connections: ['creation', 'minting'] },
    
    // Digital Products ecosystem
    { id: 'utility', icon: Zap, label: 'Utility NFTs', x: 75, y: 30, size: 'medium', connections: ['digital-products', 'access'] },
    { id: 'licensing', icon: Shield, label: 'Licensing', x: 85, y: 35, size: 'small', connections: ['digital-products'] },
    { id: 'distribution', icon: TrendingUp, label: 'Distribution', x: 95, y: 25, size: 'small', connections: ['digital-products'] },
    { id: 'access', icon: Eye, label: 'Access Rights', x: 75, y: 45, size: 'small', connections: ['utility'] },
    
    // Product Certification ecosystem
    { id: 'verification', icon: Shield, label: 'Verification', x: 25, y: 70, size: 'medium', connections: ['certification', 'blockchain'] },
    { id: 'tracking', icon: BarChart2, label: 'Supply Chain', x: 15, y: 65, size: 'small', connections: ['certification'] },
    { id: 'authenticity', icon: Lock, label: 'Authenticity', x: 35, y: 80, size: 'small', connections: ['certification', 'verification'] },
    { id: 'blockchain', icon: Star, label: 'Blockchain Proof', x: 25, y: 95, size: 'small', connections: ['verification'] },
    
    // Marketplace ecosystem
    { id: 'trading', icon: DollarSign, label: 'Trading', x: 75, y: 70, size: 'medium', connections: ['marketplace', 'pricing'] },
    { id: 'auctions', icon: Crown, label: 'Auctions', x: 95, y: 75, size: 'small', connections: ['marketplace'] },
    { id: 'collections', icon: Users, label: 'Collections', x: 85, y: 95, size: 'small', connections: ['marketplace', 'trading'] },
    { id: 'pricing', icon: Percent, label: 'Dynamic Pricing', x: 75, y: 95, size: 'small', connections: ['trading'] }
  ];

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'large': return 'w-16 h-16 p-4';
      case 'medium': return 'w-12 h-12 p-3';
      case 'small': return 'w-10 h-10 p-2';
      default: return 'w-12 h-12 p-3';
    }
  };

  return (
    <div className="w-full h-screen bg-white overflow-y-auto">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white border-2 border-black hover:bg-black hover:text-white transition-colors shadow-lg"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header Section */}
      <div className="w-full pt-16 pb-8 px-4">
        {/* Title */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 font-serif">Why Open an NFT Business?</h2>
          <p className="text-sm sm:text-base text-gray-600 font-light tracking-wide mb-4">Business can create and sell digital art, digital products, and evolve the actual management process through NFT certification of products and prices</p>
          <div className="w-16 h-px bg-black" />
        </div>
      </div>

      {/* NFT Structure Title */}
      <div className="w-full px-4 mb-8">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-center">NFT Structure</h3>
        </div>
      </div>

      {/* Mind Map Container */}
      <div className="w-full px-4 mb-8">
        <div className="relative w-full max-w-6xl h-[400px] sm:h-[500px] md:h-[600px] mx-auto">
          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            {nodes.map((node) =>
              node.connections.map((connId) => {
                const connectedNode = nodes.find(n => n.id === connId);
                if (!connectedNode) return null;
                
                const isHighlighted = hoveredNode === node.id || hoveredNode === connId;
                const isSelected = selectedNode === node.id || selectedNode === connId;
                
                return (
                  <g key={`${node.id}-${connId}`}>
                    <line
                      x1={`${node.x}%`}
                      y1={`${node.y}%`}
                      x2={`${connectedNode.x}%`}
                      y2={`${connectedNode.y}%`}
                      stroke={isHighlighted ? "black" : "black"}
                      strokeWidth={isHighlighted ? "2" : "1"}
                      opacity={isHighlighted ? "0.6" : isSelected ? "0.4" : "0.2"}
                      strokeDasharray={isHighlighted ? "0" : "5,5"}
                      className="transition-all duration-300"
                    />
                  </g>
                );
              })
            )}
          </svg>

          {/* Nodes */}
          {nodes.map((node, index) => (
            <div
              key={node.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out animate-scale-in`}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                zIndex: 10,
                animationDelay: `${index * 100}ms`
              }}
            >
              <div 
                className="group cursor-pointer relative"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                style={{ padding: '40px 20px 50px 20px' }}
              >
                <div className={`relative ${getSizeClass(node.size)} rounded-full border-2 transition-all duration-500 hover:scale-110 hover:shadow-xl flex items-center justify-center ${
                  selectedNode === node.id 
                    ? 'border-black bg-black text-white shadow-2xl scale-110' 
                    : hoveredNode === node.id
                    ? 'border-black bg-black text-white shadow-xl'
                    : 'border-black bg-white hover:bg-black hover:text-white'
                }`}>
                  <node.icon className="transition-colors" />
                </div>
                
                {/* Node label - positioned within the hover area */}
                <div className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold tracking-wider transition-opacity duration-500 whitespace-nowrap ${
                  hoveredNode === node.id || selectedNode === node.id ? 'opacity-100' : 'opacity-0'
                }`}>
                  {node.label}
                </div>

                {/* Enhanced pulse effect for large nodes */}
                {node.size === 'large' && (
                  <div className={`absolute inset-0 rounded-full border-2 border-black transition-all duration-300 ${
                    hoveredNode === node.id || selectedNode === node.id 
                      ? 'animate-ping opacity-30' 
                      : 'opacity-0'
                  }`} />
                )}

                {/* Selection indicator */}
                {selectedNode === node.id && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full border-2 border-white" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="w-full px-4 mb-8">
          <div className="max-w-4xl mx-auto bg-white border-2 border-black p-4 md:p-6 animate-slide-up shadow-xl">
            <h3 className="text-xl font-bold mb-4 font-serif">
              {nodes.find(n => n.id === selectedNode)?.label}
            </h3>
            <div className="space-y-3">
              {selectedNode === 'digital-art' && (
                <>
                  <p className="text-sm text-gray-600">Create, mint, and sell unique digital artworks with blockchain verification and royalty systems</p>
                  <div className="text-xs space-y-1">
                    <div>• Global marketplace access</div>
                    <div>• Automatic royalty payments</div>
                    <div>• Blockchain authenticity</div>
                  </div>
                </>
              )}
              {selectedNode === 'digital-products' && (
                <>
                  <p className="text-sm text-gray-600">Develop utility NFTs for digital products, software licenses, and access rights</p>
                  <div className="text-xs space-y-1">
                    <div>• Software license management</div>
                    <div>• Access control systems</div>
                    <div>• Subscription automation</div>
                  </div>
                </>
              )}
              {selectedNode === 'certification' && (
                <>
                  <p className="text-sm text-gray-600">Use NFTs to certify product authenticity, track supply chains, and verify ownership</p>
                  <div className="text-xs space-y-1">
                    <div>• Supply chain tracking</div>
                    <div>• Authenticity verification</div>
                    <div>• Quality assurance</div>
                  </div>
                </>
              )}
              {selectedNode === 'marketplace' && (
                <>
                  <p className="text-sm text-gray-600">Build or use NFT marketplaces for trading, auctions, and collection management</p>
                  <div className="text-xs space-y-1">
                    <div>• Trading and auctions</div>
                    <div>• Collection management</div>
                    <div>• Dynamic pricing</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NFT Creation Flow Indicators */}
      <div className="w-full px-4 mb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8">
            <div className="text-xs font-bold tracking-wider text-gray-600 mb-2 sm:mb-0">NFT CREATION FLOW</div>
            {['Create', 'Mint', 'List', 'Trade'].map((step, index) => (
              <div key={step} className="flex items-center space-x-3 group cursor-pointer">
                <div className={`w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center text-xs font-bold transition-all duration-300 group-hover:bg-black group-hover:text-white ${
                  index === 0 ? 'animate-pulse' : ''
                }`}>
                  {index + 1}
                </div>
                <div className="text-sm font-semibold tracking-wide group-hover:text-gray-600 transition-colors">
                  {step}
                </div>
                {index < 3 && (
                  <div className="w-4 h-px bg-black opacity-20 group-hover:opacity-40 transition-opacity hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="w-full px-4 mb-8">
        <div className="max-w-4xl mx-auto text-center animate-bounce">
          <div className="text-sm font-semibold text-gray-600 mb-2">Scroll for more content</div>
          <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center mx-auto">
            <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* NFT Use Cases Section */}
      <div className="w-full bg-gray-50 border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif mb-2">NFT Use Cases</h3>
            <p className="text-sm md:text-base text-gray-600">How businesses can leverage NFTs for growth and new revenue streams</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Digital Art Business Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'digital-art' ? 'sm:col-span-2 lg:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'digital-art' ? null : 'digital-art')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <Palette className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Digital Art Business</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  Create, mint, and sell unique digital artworks with blockchain verification, automatic royalty systems, and global marketplace access
                </p>
                {expandedCard === 'digital-art' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Digital Art Business Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Create and sell unique digital artworks globally</li>
                      <li>• Automatic royalty payments on every resale</li>
                      <li>• Blockchain authenticity verification</li>
                      <li>• Access to global NFT marketplaces</li>
                      <li>• Fractional ownership and investment opportunities</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Digital Products Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'digital-products' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'digital-products' ? null : 'digital-products')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Digital Products</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  Develop utility NFTs for digital products, software licenses, and access rights with smart contract automation and resale capabilities
                </p>
                {expandedCard === 'digital-products' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Digital Products Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Software license management and automation</li>
                      <li>• Access control systems for premium content</li>
                      <li>• Subscription automation and billing</li>
                      <li>• Digital asset ownership and transfer</li>
                      <li>• Secondary market revenue from resales</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Product Certification Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'certification' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'certification' ? null : 'certification')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <Award className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Product Certification</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  Use NFTs to certify product authenticity, track supply chains, and verify ownership throughout the entire product lifecycle
                </p>
                {expandedCard === 'certification' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Product Certification Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Complete supply chain tracking and transparency</li>
                      <li>• Authenticity verification and anti-counterfeiting</li>
                      <li>• Quality assurance and compliance reporting</li>
                      <li>• Ownership transfer and provenance history</li>
                      <li>• Enhanced customer trust and brand value</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scroll Indicator for Pricing */}
          <div className="text-center mt-8">
            <div className="flex flex-col items-center text-center">
              <div className="text-sm font-semibold text-gray-600 mb-2">Continue scrolling for pricing</div>
              <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NFT Metrics Examples */}
      <div className="w-full bg-white border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="text-lg font-bold tracking-wider text-gray-600">NFT METRICS EXAMPLES</div>
            <div className="text-sm text-gray-400 flex items-center">
              <span>Real-world NFT business performance</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {[
              { title: 'Floor Price', value: '3.2 ETH', subtitle: 'Collection floor', trend: '+15%' },
              { title: 'Volume', value: '847 ETH', subtitle: '24h trading', trend: '+12%' },
              { title: 'Holders', value: '12.4K', subtitle: 'Unique owners', trend: '+8%' },
              { title: 'Listed', value: '234', subtitle: '1.9% supply', trend: '+3%' },
              { title: 'Avg Sale', value: '4.7 ETH', subtitle: '7d average', trend: '+5%' },
              { title: 'Royalty', value: '7.5%', subtitle: 'Creator fee', trend: '+2%' },
              { title: 'Mint Cost', value: '0.08 ETH', subtitle: 'Gas fee', trend: '-8%' },
              { title: 'Market Cap', value: '2.1K ETH', subtitle: 'Total value', trend: '+9%' },
              { title: 'Sales', value: '1.2K', subtitle: 'Total sold', trend: '+7%' },
              { title: 'Revenue', value: '89 ETH', subtitle: 'Creator earnings', trend: '+15%' }
            ].map((stat, index) => (
              <div
                key={stat.title}
                className={`bg-white border-2 border-black p-4 hover:bg-black hover:text-white transition-all duration-500 animate-slide-up`}
                style={{
                  animationDelay: `${(index + 3) * 100}ms`
                }}
              >
                <div className="text-2xl font-bold mb-1 font-serif">{stat.value}</div>
                <div className="text-sm font-semibold mb-1">{stat.title}</div>
                <div className="text-xs opacity-60 mb-2">{stat.subtitle}</div>
                <div className={`text-xs font-medium ${
                  stat.trend.startsWith('+') ? 'text-green-600' : 
                  stat.trend.startsWith('-') ? 'text-red-600' : 
                  'text-gray-600'
                }`}>{stat.trend}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NFT Opening Costs Section */}
      <div className="w-full bg-gray-50 border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold font-serif mb-2">NFT Opening Costs</h3>
            <p className="text-sm md:text-base text-gray-600">Choose your NFT business package and start your digital asset journey</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Free Strategic Partner */}
            <div className="bg-white border-2 border-black p-6 hover:shadow-xl transition-all duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">FREE</span>
                </div>
                <h4 className="text-xl font-bold font-serif mb-2">Strategic Partner</h4>
                <div className="text-3xl font-bold mb-4">$0</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Basic NFT minting</li>
                  <li>• Community support</li>
                  <li>• Documentation</li>
                  <li>• Basic analytics</li>
                  <li>• Email support</li>
                </ul>
                <button className="w-full mt-6 bg-black text-white py-2 px-4 hover:bg-gray-800 transition-colors">
                  Get Started
                </button>
              </div>
            </div>

            {/* $1K Package */}
            <div className="bg-white border-2 border-black p-6 hover:shadow-xl transition-all duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1K</span>
                </div>
                <h4 className="text-xl font-bold font-serif mb-2">Starter NFT</h4>
                <div className="text-3xl font-bold mb-4">$1,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Custom NFT collection</li>
                  <li>• Smart contract deployment</li>
                  <li>• Basic marketplace integration</li>
                  <li>• Basic analytics</li>
                  <li>• 30-day support</li>
                </ul>
                <button className="w-full mt-6 bg-black text-white py-2 px-4 hover:bg-gray-800 transition-colors">
                  Choose Plan
                </button>
              </div>
            </div>

            {/* $5K Package */}
            <div className="bg-white border-2 border-black p-6 hover:shadow-xl transition-all duration-300 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-black px-3 py-1 text-xs font-bold rounded-full">POPULAR</span>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-yellow-600">5K</span>
                </div>
                <h4 className="text-xl font-bold font-serif mb-2">Professional NFT</h4>
                <div className="text-3xl font-bold mb-4">$5,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Advanced NFT features</li>
                  <li>• Custom marketplace</li>
                  <li>• Royalty automation</li>
                  <li>• Advanced analytics</li>
                  <li>• 90-day support</li>
                </ul>
                <button className="w-full mt-6 bg-black text-white py-2 px-4 hover:bg-gray-800 transition-colors">
                  Choose Plan
                </button>
              </div>
            </div>

            {/* $20K Package */}
            <div className="bg-white border-2 border-black p-6 hover:shadow-xl transition-all duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">20K</span>
                </div>
                <h4 className="text-xl font-bold font-serif mb-2">Enterprise NFT</h4>
                <div className="text-3xl font-bold mb-4">$20,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Full NFT ecosystem</li>
                  <li>• Multi-chain support</li>
                  <li>• Custom development</li>
                  <li>• White-label solution</li>
                  <li>• 1-year support</li>
                </ul>
                <button className="w-full mt-6 bg-black text-white py-2 px-4 hover:bg-gray-800 transition-colors">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>

          {/* Tech NFT Title */}
          <div className="text-center mt-12">
            <h4 className="text-2xl md:text-3xl font-bold font-serif mb-4">Powered by Advanced NFT Technology</h4>
            <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
              Our NFT solutions are built on cutting-edge blockchain technology, ensuring security, 
              authenticity, and maximum value for your digital assets and business operations.
            </p>
            <div className="flex justify-center space-x-8 mt-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">OS</span>
                </div>
                <span className="text-xs font-semibold">OpenSea</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">RAR</span>
                </div>
                <span className="text-xs font-semibold">Rarible</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">FND</span>
                </div>
                <span className="text-xs font-semibold">Foundation</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">SR</span>
                </div>
                <span className="text-xs font-semibold">SuperRare</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default NFTMindMap;