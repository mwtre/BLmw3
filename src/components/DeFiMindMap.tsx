import React, { useState } from 'react';
import { X, DollarSign, Zap, Lock, BarChart3, ArrowUpDown, Percent, TrendingUp, Shield, Coins, Users, FileText } from 'lucide-react';

interface DeFiMindMapProps {
  onClose: () => void;
}

const DeFiMindMap: React.FC<DeFiMindMapProps> = ({ onClose }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const nodes = [
    // Core DeFi protocols
    { id: 'lending', icon: DollarSign, label: 'Lending', x: 25, y: 15, size: 'large', connections: ['collateral', 'interest', 'liquidation'] },
    { id: 'dex', icon: ArrowUpDown, label: 'DEX', x: 75, y: 15, size: 'large', connections: ['amm', 'liquidity', 'fees'] },
    
    // Lending ecosystem
    { id: 'collateral', icon: Shield, label: 'Collateral', x: 15, y: 35, size: 'medium', connections: ['lending', 'liquidation'] },
    { id: 'interest', icon: Percent, label: 'Interest', x: 35, y: 35, size: 'small', connections: ['lending', 'yield'] },
    { id: 'liquidation', icon: TrendingUp, label: 'Liquidation', x: 25, y: 55, size: 'small', connections: ['lending', 'collateral'] },
    
    // DEX ecosystem
    { id: 'amm', icon: BarChart3, label: 'AMM', x: 85, y: 35, size: 'medium', connections: ['dex', 'liquidity'] },
    { id: 'liquidity', icon: Zap, label: 'Liquidity', x: 65, y: 35, size: 'medium', connections: ['dex', 'amm', 'yield', 'fees'] },
    { id: 'fees', icon: Coins, label: 'Fees', x: 75, y: 55, size: 'small', connections: ['dex', 'liquidity'] },
    
    // Yield generation
    { id: 'yield', icon: TrendingUp, label: 'Yield Farming', x: 50, y: 25, size: 'large', connections: ['interest', 'liquidity', 'staking', 'rewards'] },
    { id: 'staking', icon: Lock, label: 'Staking', x: 40, y: 45, size: 'medium', connections: ['yield', 'rewards'] },
    { id: 'rewards', icon: Percent, label: 'Rewards', x: 60, y: 45, size: 'medium', connections: ['yield', 'staking'] },
    
    // Advanced features
    { id: 'derivatives', icon: BarChart3, label: 'Derivatives', x: 20, y: 75, size: 'medium', connections: ['options', 'futures'] },
    { id: 'options', icon: TrendingUp, label: 'Options', x: 10, y: 85, size: 'small', connections: ['derivatives'] },
    { id: 'futures', icon: ArrowUpDown, label: 'Futures', x: 30, y: 85, size: 'small', connections: ['derivatives'] },
    
    // Insurance & Risk
    { id: 'insurance', icon: Shield, label: 'Insurance', x: 80, y: 75, size: 'medium', connections: ['risk', 'coverage'] },
    { id: 'risk', icon: BarChart3, label: 'Risk Mgmt', x: 70, y: 85, size: 'small', connections: ['insurance'] },
    { id: 'coverage', icon: Lock, label: 'Coverage', x: 90, y: 85, size: 'small', connections: ['insurance'] }
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
        className="absolute top-4 md:top-8 right-4 md:right-8 z-50 p-2 md:p-3 rounded-full bg-white border-2 border-black hover:bg-black hover:text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Header Section */}
      <div className="relative w-full h-screen flex items-center justify-center p-4 md:p-8">
      {/* Title */}
        <div className="absolute top-4 md:top-8 left-4 md:left-8 z-30">
          <h2 className="text-3xl md:text-5xl font-bold mb-2 font-serif">Why Open a DeFi Business?</h2>
          <p className="text-sm md:text-base text-gray-600 font-light tracking-wide">Business will open a business account and trade, create staking pool and create a crypto reserve</p>
        <div className="w-16 h-px bg-black mt-4" />
      </div>

        {/* DeFi Structure Title */}
        <div className="absolute top-32 md:top-40 left-1/2 transform -translate-x-1/2 z-20">
          <h3 className="text-2xl md:text-3xl font-bold font-serif text-center">DeFi Structure</h3>
      </div>

      {/* Mind Map Container */}
        <div className="relative w-full max-w-6xl h-[600px] mx-auto z-10">
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

        {/* Node Details Panel */}
        {selectedNode && (
          <div className="absolute top-1/2 right-4 md:right-8 transform -translate-y-1/2 bg-white border-2 border-black p-4 md:p-6 max-w-xs md:max-w-sm animate-slide-up z-30 shadow-xl">
            <h3 className="text-xl font-bold mb-4 font-serif">
              {nodes.find(n => n.id === selectedNode)?.label}
            </h3>
            <div className="space-y-3">
              {selectedNode === 'lending' && (
                <>
                  <p className="text-sm text-gray-600">Decentralized lending protocols for businesses</p>
                  <div className="text-xs space-y-1">
                    <div>• Business account integration</div>
                    <div>• Collateral management</div>
                    <div>• Interest rate optimization</div>
                  </div>
                </>
              )}
              {selectedNode === 'dex' && (
                <>
                  <p className="text-sm text-gray-600">Decentralized exchange for trading</p>
                  <div className="text-xs space-y-1">
                    <div>• Automated market making</div>
                    <div>• Liquidity provision</div>
                    <div>• Fee optimization</div>
                  </div>
                </>
              )}
              {selectedNode === 'staking' && (
                <>
                  <p className="text-sm text-gray-600">Staking pools for passive income</p>
                  <div className="text-xs space-y-1">
                    <div>• Pool creation and management</div>
                    <div>• Reward distribution</div>
                    <div>• Risk management</div>
                  </div>
                </>
              )}
              {selectedNode === 'yield' && (
                <>
                  <p className="text-sm text-gray-600">Yield farming strategies</p>
                  <div className="text-xs space-y-1">
                    <div>• Multi-protocol farming</div>
                    <div>• Automated strategies</div>
                    <div>• Risk-adjusted returns</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
          <div className="flex flex-col items-center text-center">
            <div className="text-sm font-semibold text-gray-600 mb-2">Scroll for more content</div>
            <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* DeFi Use Cases Section */}
      <div className="w-full bg-gray-50 border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold font-serif mb-2">DeFi Use Cases</h3>
            <p className="text-sm md:text-base text-gray-600">How businesses can leverage DeFi protocols for growth</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Decentralized Business Wallet Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'wallet' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'wallet' ? null : 'wallet')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Decentralized Business Wallet</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  Open a decentralized business wallet and trade with prelaunch coins and launchpad opportunities for maximum growth potential
                </p>
                {expandedCard === 'wallet' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Decentralized Business Wallet Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Access to prelaunch coins and early opportunities</li>
                      <li>• Launchpad integration for new projects</li>
                      <li>• Multi-signature wallet management</li>
                      <li>• Advanced trading tools and analytics</li>
                      <li>• Integration with existing business systems</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Staking Pool Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'staking' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'staking' ? null : 'staking')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Staking Pool</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  Create staking pools to generate passive income while providing liquidity to the DeFi ecosystem
                </p>
                {expandedCard === 'staking' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Staking Pool Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Generate consistent passive income</li>
                      <li>• Support network security and governance</li>
                      <li>• Diversify revenue streams</li>
                      <li>• Access to governance tokens</li>
                      <li>• Automated reward distribution</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Crypto Reserve Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'reserve' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'reserve' ? null : 'reserve')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Crypto Reserve</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  Create a crypto reserve to hedge against inflation and diversify your business treasury with digital assets
                </p>
                {expandedCard === 'reserve' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Crypto Reserve Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Hedge against traditional market volatility</li>
                      <li>• Diversify treasury holdings</li>
                      <li>• Access to yield-generating protocols</li>
                      <li>• Global liquidity and accessibility</li>
                      <li>• Future-proof financial strategy</li>
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

      {/* DeFi Metrics Examples */}
      <div className="w-full bg-white border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="text-lg font-bold tracking-wider text-gray-600">DeFi METRICS EXAMPLES</div>
            <div className="text-sm text-gray-400 flex items-center">
              <span>Real-world DeFi performance</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {[
              { title: 'TVL', value: '$127M', subtitle: 'Total locked', trend: '+18%' },
              { title: 'APY', value: '24.7%', subtitle: 'Average yield', trend: '+5%' },
              { title: 'Volume', value: '$45M', subtitle: '24h trading', trend: '+12%' },
              { title: 'Users', value: '89K', subtitle: 'Active wallets', trend: '+8%' },
              { title: 'Pools', value: '156', subtitle: 'Liquidity pairs', trend: '+3%' },
              { title: 'Protocols', value: '23', subtitle: 'Integrated', trend: '+2%' },
              { title: 'Fees', value: '$2.1M', subtitle: 'Monthly revenue', trend: '+15%' },
              { title: 'Staking', value: '67%', subtitle: 'Pool utilization', trend: '+7%' },
              { title: 'Lending', value: '$89M', subtitle: 'Total borrowed', trend: '+9%' },
              { title: 'Insurance', value: '$12M', subtitle: 'Coverage value', trend: '+4%' }
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

      {/* DeFi Opening Costs Section */}
      <div className="w-full bg-gray-50 border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold font-serif mb-2">DeFi Opening Costs</h3>
            <p className="text-sm md:text-base text-gray-600">Choose your DeFi package and start your decentralized finance journey</p>
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
                  <li>• Basic DeFi integration</li>
                  <li>• Simple trading tools</li>
                  <li>• Basic staking setup</li>
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
                <h4 className="text-xl font-bold font-serif mb-2">Starter DeFi</h4>
                <div className="text-3xl font-bold mb-4">$1,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Advanced trading tools</li>
                  <li>• Multi-pool staking</li>
                  <li>• Yield optimization</li>
                  <li>• Advanced analytics</li>
                  <li>• Priority support</li>
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
                <h4 className="text-xl font-bold font-serif mb-2">Professional DeFi</h4>
                <div className="text-3xl font-bold mb-4">$5,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Full DeFi suite</li>
                  <li>• Custom staking pools</li>
                  <li>• Automated strategies</li>
                  <li>• Risk management</li>
                  <li>• 24/7 support</li>
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
                <h4 className="text-xl font-bold font-serif mb-2">Enterprise DeFi</h4>
                <div className="text-3xl font-bold mb-4">$20,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• White-label solution</li>
                  <li>• Custom protocol development</li>
                  <li>• Advanced integrations</li>
                  <li>• Dedicated manager</li>
                  <li>• SLA guarantee</li>
                </ul>
                <button className="w-full mt-6 bg-black text-white py-2 px-4 hover:bg-gray-800 transition-colors">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>

          {/* Tech Crypto Title */}
          <div className="text-center mt-12">
            <h4 className="text-2xl md:text-3xl font-bold font-serif mb-4">Powered by Advanced DeFi Technology</h4>
            <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
              Our DeFi solutions are built on cutting-edge protocols, ensuring security, 
              transparency, and maximum yield for your decentralized finance operations.
            </p>
            <div className="flex justify-center space-x-8 mt-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">UNI</span>
                </div>
                <span className="text-xs font-semibold">Uniswap</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">AAVE</span>
                </div>
                <span className="text-xs font-semibold">Aave</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">COMP</span>
                </div>
                <span className="text-xs font-semibold">Compound</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">CRV</span>
                </div>
                <span className="text-xs font-semibold">Curve</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeFiMindMap;