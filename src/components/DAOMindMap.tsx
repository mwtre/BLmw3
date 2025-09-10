import React, { useState } from 'react';
import { X, Users, Vote, Shield, Coins, FileText, Gavel, Target, Globe, Lock } from 'lucide-react';

interface DAOMindMapProps {
  onClose: () => void;
}

const DAOMindMap: React.FC<DAOMindMapProps> = ({ onClose }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  const nodes = [
    // Core governance layer
    { id: 'governance', icon: Vote, label: 'Governance', x: 50, y: 20, size: 'large', connections: ['proposals', 'voting', 'treasury'] },
    
    // Proposal system
    { id: 'proposals', icon: FileText, label: 'Proposals', x: 20, y: 35, size: 'medium', connections: ['governance', 'community', 'voting'] },
    { id: 'voting', icon: Gavel, label: 'Voting', x: 80, y: 35, size: 'medium', connections: ['governance', 'token', 'execution'] },
    
    // Community layer
    { id: 'community', icon: Users, label: 'Community', x: 15, y: 60, size: 'large', connections: ['proposals', 'treasury', 'delegates'] },
    { id: 'delegates', icon: Target, label: 'Delegates', x: 35, y: 75, size: 'small', connections: ['community', 'voting'] },
    
    // Treasury management
    { id: 'treasury', icon: Shield, label: 'Treasury', x: 50, y: 80, size: 'large', connections: ['governance', 'community', 'token', 'multisig'] },
    { id: 'multisig', icon: Lock, label: 'Multi-Sig', x: 70, y: 70, size: 'small', connections: ['treasury', 'execution'] },
    
    // Token economics
    { id: 'token', icon: Coins, label: 'Token', x: 85, y: 60, size: 'large', connections: ['voting', 'treasury', 'rewards'] },
    { id: 'rewards', icon: Target, label: 'Rewards', x: 90, y: 45, size: 'small', connections: ['token', 'execution'] },
    
    // Execution layer
    { id: 'execution', icon: Globe, label: 'Execution', x: 65, y: 50, size: 'medium', connections: ['voting', 'multisig', 'rewards'] }
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
          <h2 className="text-3xl md:text-5xl font-bold mb-2 font-serif">Why Open a DAO?</h2>
          <p className="text-sm md:text-base text-gray-600 font-light tracking-wide">As business you can improve every aspect efficiently and increase your profit</p>
        <div className="w-16 h-px bg-black mt-4" />
      </div>

        {/* DAO Structure Title */}
        <div className="absolute top-32 md:top-40 left-1/2 transform -translate-x-1/2 z-20">
          <h3 className="text-2xl md:text-3xl font-bold font-serif text-center">DAO Structure</h3>
      </div>

      {/* Mind Map Container */}
        <div className="relative w-full max-w-6xl h-[600px] mx-auto z-10">
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
          <defs>
            <pattern id="daoPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="black" opacity="0.1" />
            </pattern>
          </defs>
          
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
                className="group cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              >
                <div className={`relative ${getSizeClass(node.size)} rounded-full border-2 transition-all duration-500 hover:scale-110 hover:shadow-xl flex items-center justify-center ${
                  selectedNode === node.id 
                    ? 'border-black bg-black text-white shadow-2xl scale-110' 
                    : hoveredNode === node.id
                    ? 'border-black bg-black text-white shadow-xl'
                    : 'border-black bg-white hover:bg-black hover:text-white'
                }`}>
                <node.icon className="transition-colors" />
                
                {/* Node label */}
                  <div className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold tracking-wider transition-opacity duration-300 whitespace-nowrap ${
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
              {selectedNode === 'governance' && (
                <>
                  <p className="text-sm text-gray-600">Core decision-making system for the DAO</p>
                  <div className="text-xs space-y-1">
                    <div>• Proposal creation and management</div>
                    <div>• Voting mechanisms</div>
                    <div>• Execution protocols</div>
                  </div>
                </>
              )}
              {selectedNode === 'treasury' && (
                <>
                  <p className="text-sm text-gray-600">Financial management and asset control</p>
                  <div className="text-xs space-y-1">
                    <div>• Multi-signature wallet</div>
                    <div>• Budget allocation</div>
                    <div>• Investment decisions</div>
                  </div>
                </>
              )}
              {selectedNode === 'community' && (
                <>
                  <p className="text-sm text-gray-600">Member engagement and participation</p>
                  <div className="text-xs space-y-1">
                    <div>• Member onboarding</div>
                    <div>• Discussion forums</div>
                    <div>• Reputation system</div>
                  </div>
                </>
              )}
              {selectedNode === 'token' && (
                <>
                  <p className="text-sm text-gray-600">Token economics and distribution</p>
                  <div className="text-xs space-y-1">
                    <div>• Voting power allocation</div>
                    <div>• Reward mechanisms</div>
                    <div>• Token utility</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Governance Flow Indicators */}
        <div className="absolute top-1/2 left-2 md:left-4 transform -translate-y-1/2 z-20 hidden md:block">
          <div className="flex flex-col space-y-4">
            <div className="text-xs font-bold tracking-wider text-gray-600 mb-2">GOVERNANCE FLOW</div>
            {['Propose', 'Discuss', 'Vote', 'Execute'].map((step, index) => (
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
                  <div className="w-4 h-px bg-black opacity-20 group-hover:opacity-40 transition-opacity" />
                )}
              </div>
            ))}
          </div>
        </div>

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

      {/* DAO Use Cases Section */}
      <div className="w-full bg-gray-50 border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold font-serif mb-2">DAO Use Cases</h3>
            <p className="text-sm md:text-base text-gray-600">How businesses can leverage DAO structure for growth</p>
                </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Community Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'community' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'community' ? null : 'community')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Community</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  A business can evolve customers to community giving value to feedback and offer more detailed products
                </p>
                {expandedCard === 'community' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Community Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Transform customers into engaged community members</li>
                      <li>• Collect valuable feedback for product development</li>
                      <li>• Create detailed, personalized product offerings</li>
                      <li>• Build brand loyalty through community engagement</li>
                      <li>• Enable peer-to-peer support and knowledge sharing</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Token Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'token' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'token' ? null : 'token')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <Coins className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Token</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  A business can create a token and use it as rewards for customers giving the best possible fidelity program
                </p>
                {expandedCard === 'token' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Token Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Create custom loyalty tokens for customer rewards</li>
                      <li>• Implement the most effective fidelity program</li>
                      <li>• Enable token-based voting on business decisions</li>
                      <li>• Provide exclusive access to premium features</li>
                      <li>• Create a self-sustaining reward ecosystem</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Digital Product Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'digital' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'digital' ? null : 'digital')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Digital Product</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  Through the community and the token any business can start selling digital products with utility or for collection opening a new market
                </p>
                {expandedCard === 'digital' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Digital Product Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Launch utility-based digital products</li>
                      <li>• Create collectible digital assets (NFTs)</li>
                      <li>• Open new revenue streams and markets</li>
                      <li>• Leverage community for product validation</li>
                      <li>• Use tokens for exclusive product access</li>
                    </ul>
                  </div>
                )}
              </div>
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

      {/* DAO Metrics Examples */}
      <div className="w-full bg-white border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="text-lg font-bold tracking-wider text-gray-600">DAO METRICS EXAMPLES</div>
            <div className="text-sm text-gray-400 flex items-center">
              <span>Real-world DAO performance</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {[
              { title: 'Active Proposals', value: '23', subtitle: 'Pending votes', trend: '+12%' },
              { title: 'Token Holders', value: '15.2K', subtitle: 'Voting members', trend: '+8%' },
              { title: 'Treasury Value', value: '$4.7M', subtitle: 'Total assets', trend: '+15%' },
              { title: 'Participation', value: '67%', subtitle: 'Voter turnout', trend: '+5%' },
              { title: 'Proposals Passed', value: '89%', subtitle: 'Success rate', trend: '+2%' },
              { title: 'Delegates', value: '127', subtitle: 'Active delegates', trend: '+3%' },
              { title: 'Quorum', value: '45%', subtitle: 'Required threshold', trend: '0%' },
              { title: 'Voting Power', value: '2.3M', subtitle: 'Total tokens', trend: '+7%' },
              { title: 'Execution Time', value: '2.1d', subtitle: 'Avg execution', trend: '-15%' },
              { title: 'Gas Fees', value: '$12K', subtitle: 'Monthly cost', trend: '-8%' }
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

      {/* DAO Opening Costs Section */}
      <div className="w-full bg-gray-50 border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold font-serif mb-2">DAO Opening Costs</h3>
            <p className="text-sm md:text-base text-gray-600">Choose your DAO package and start your decentralized journey</p>
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
                  <li>• Basic DAO setup</li>
                  <li>• Community governance</li>
                  <li>• Token creation</li>
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
                <h4 className="text-xl font-bold font-serif mb-2">Starter DAO</h4>
                <div className="text-3xl font-bold mb-4">$1,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Advanced governance</li>
                  <li>• Multi-sig wallet</li>
                  <li>• Custom tokenomics</li>
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
                <h4 className="text-xl font-bold font-serif mb-2">Professional DAO</h4>
                <div className="text-3xl font-bold mb-4">$5,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Full governance suite</li>
                  <li>• Treasury management</li>
                  <li>• NFT integration</li>
                  <li>• Custom branding</li>
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
                <h4 className="text-xl font-bold font-serif mb-2">Enterprise DAO</h4>
                <div className="text-3xl font-bold mb-4">$20,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• White-label solution</li>
                  <li>• Custom development</li>
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
            <h4 className="text-2xl md:text-3xl font-bold font-serif mb-4">Powered by Advanced Crypto Technology</h4>
            <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
              Our DAO solutions are built on cutting-edge blockchain technology, ensuring security, 
              transparency, and scalability for your decentralized organization.
            </p>
            <div className="flex justify-center space-x-8 mt-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">ETH</span>
                </div>
                <span className="text-xs font-semibold">Ethereum</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">POLY</span>
                </div>
                <span className="text-xs font-semibold">Polygon</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">ARB</span>
                </div>
                <span className="text-xs font-semibold">Arbitrum</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">OP</span>
                </div>
                <span className="text-xs font-semibold">Optimism</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DAOMindMap;