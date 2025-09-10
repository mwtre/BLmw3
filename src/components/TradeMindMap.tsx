import React, { useState } from 'react';
import { X, TrendingUp, TrendingDown, BarChart2, Activity, Target, Zap, DollarSign, Percent, ArrowUpDown, LineChart, PieChart, Users, Shield, FileText } from 'lucide-react';

interface TradeMindMapProps {
  onClose: () => void;
}

const TradeMindMap: React.FC<TradeMindMapProps> = ({ onClose }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const nodes = [
    // Core trading types
    { id: 'spot', icon: TrendingUp, label: 'Spot Trading', x: 20, y: 20, size: 'large', connections: ['orderbook', 'market', 'limit'] },
    { id: 'futures', icon: TrendingDown, label: 'Futures', x: 80, y: 20, size: 'large', connections: ['leverage', 'margin', 'funding'] },
    { id: 'options', icon: Target, label: 'Options', x: 20, y: 80, size: 'large', connections: ['calls', 'puts', 'greeks'] },
    { id: 'perpetual', icon: Activity, label: 'Perpetual', x: 80, y: 80, size: 'large', connections: ['funding', 'leverage', 'liquidation'] },
    
    // Spot trading components
    { id: 'orderbook', icon: BarChart2, label: 'Order Book', x: 10, y: 35, size: 'medium', connections: ['spot', 'market', 'limit'] },
    { id: 'market', icon: Zap, label: 'Market Orders', x: 30, y: 35, size: 'small', connections: ['spot', 'orderbook'] },
    { id: 'limit', icon: Target, label: 'Limit Orders', x: 20, y: 50, size: 'small', connections: ['spot', 'orderbook'] },
    
    // Futures components
    { id: 'leverage', icon: TrendingUp, label: 'Leverage', x: 70, y: 35, size: 'medium', connections: ['futures', 'perpetual', 'margin'] },
    { id: 'margin', icon: DollarSign, label: 'Margin', x: 90, y: 35, size: 'medium', connections: ['futures', 'leverage', 'liquidation'] },
    { id: 'funding', icon: Percent, label: 'Funding Rate', x: 80, y: 50, size: 'small', connections: ['futures', 'perpetual'] },
    
    // Options components
    { id: 'calls', icon: TrendingUp, label: 'Call Options', x: 10, y: 65, size: 'small', connections: ['options', 'greeks'] },
    { id: 'puts', icon: TrendingDown, label: 'Put Options', x: 30, y: 65, size: 'small', connections: ['options', 'greeks'] },
    { id: 'greeks', icon: LineChart, label: 'Greeks', x: 20, y: 95, size: 'small', connections: ['options', 'calls', 'puts'] },
    
    // Risk management
    { id: 'liquidation', icon: Activity, label: 'Liquidation', x: 90, y: 65, size: 'medium', connections: ['perpetual', 'margin'] },
    { id: 'portfolio', icon: PieChart, label: 'Portfolio', x: 50, y: 50, size: 'large', connections: ['risk', 'pnl', 'analytics'] },
    { id: 'risk', icon: Target, label: 'Risk Mgmt', x: 40, y: 65, size: 'medium', connections: ['portfolio', 'stop'] },
    { id: 'pnl', icon: BarChart2, label: 'P&L', x: 60, y: 65, size: 'medium', connections: ['portfolio', 'analytics'] },
    { id: 'analytics', icon: LineChart, label: 'Analytics', x: 50, y: 35, size: 'medium', connections: ['portfolio', 'pnl'] },
    { id: 'stop', icon: ArrowUpDown, label: 'Stop Loss', x: 40, y: 80, size: 'small', connections: ['risk'] }
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
          <h2 className="text-3xl md:text-5xl font-bold mb-2 font-serif">Why Open a Trading Business?</h2>
          <p className="text-sm md:text-base text-gray-600 font-light tracking-wide">Business will open a business account, trade crypto, get free tax profit and can get back loss as business expense</p>
        <div className="w-16 h-px bg-black mt-4" />
      </div>

        {/* Trading Structure Title */}
        <div className="absolute top-32 md:top-40 left-1/2 transform -translate-x-1/2 z-20">
          <h3 className="text-2xl md:text-3xl font-bold font-serif text-center">Trading Structure</h3>
        </div>

      {/* Mind Map Container */}
        <div className="relative w-full max-w-6xl h-[600px] mx-auto z-10">
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="black" opacity="0.3" />
            </marker>
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
                    markerEnd="url(#arrowhead)"
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
              {selectedNode === 'spot' && (
                <>
                  <p className="text-sm text-gray-600">Immediate cryptocurrency trading at current market prices</p>
                  <div className="text-xs space-y-1">
                    <div>• Direct asset ownership</div>
                    <div>• Market and limit orders</div>
                    <div>• Real-time price execution</div>
                  </div>
                </>
              )}
              {selectedNode === 'futures' && (
                <>
                  <p className="text-sm text-gray-600">Trade cryptocurrency contracts with leverage</p>
                  <div className="text-xs space-y-1">
                    <div>• Leveraged positions</div>
                    <div>• Margin trading</div>
                    <div>• Settlement dates</div>
                  </div>
                </>
              )}
              {selectedNode === 'portfolio' && (
                <>
                  <p className="text-sm text-gray-600">Comprehensive portfolio management and tracking</p>
                  <div className="text-xs space-y-1">
                    <div>• Asset allocation</div>
                    <div>• Performance analytics</div>
                    <div>• Risk assessment</div>
                  </div>
                </>
              )}
              {selectedNode === 'analytics' && (
                <>
                  <p className="text-sm text-gray-600">Advanced trading analytics and insights</p>
                  <div className="text-xs space-y-1">
                    <div>• Technical indicators</div>
                    <div>• Market analysis</div>
                    <div>• Performance metrics</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Trading Flow Indicators */}
        <div className="absolute top-1/2 left-2 md:left-4 transform -translate-y-1/2 z-20 hidden md:block">
          <div className="flex flex-col space-y-4">
            <div className="text-xs font-bold tracking-wider text-gray-600 mb-2">TRADING FLOW</div>
            {['Analyze', 'Execute', 'Monitor', 'Optimize'].map((step, index) => (
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

      {/* Trading Use Cases Section */}
      <div className="w-full bg-gray-50 border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold font-serif mb-2">Trading Use Cases</h3>
            <p className="text-sm md:text-base text-gray-600">How businesses can leverage trading for growth and tax benefits</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Business Trading Account Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'business-account' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'business-account' ? null : 'business-account')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Business Trading Account</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  Open a dedicated business trading account to access institutional-grade trading tools and benefit from business tax advantages
                </p>
                {expandedCard === 'business-account' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Business Trading Account Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Institutional-grade trading platform access</li>
                      <li>• Lower trading fees and better spreads</li>
                      <li>• Advanced order types and execution</li>
                      <li>• Dedicated account manager support</li>
                      <li>• Business expense deductions for trading costs</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Tax-Free Profit Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'tax-free' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'tax-free' ? null : 'tax-free')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Tax-Free Profit</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  Generate tax-free profits through strategic business trading structures and cryptocurrency tax advantages
                </p>
                {expandedCard === 'tax-free' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Tax-Free Profit Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Long-term capital gains tax advantages</li>
                      <li>• Business expense deductions for trading tools</li>
                      <li>• Cryptocurrency tax optimization strategies</li>
                      <li>• Deferred tax structures for business growth</li>
                      <li>• International tax planning opportunities</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Loss Recovery Card */}
            <div 
              className={`bg-white border-2 border-black cursor-pointer transition-all duration-500 hover:shadow-xl ${
                expandedCard === 'loss-recovery' ? 'md:col-span-3' : ''
              }`}
              onClick={() => setExpandedCard(expandedCard === 'loss-recovery' ? null : 'loss-recovery')}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mr-4">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-serif">Loss Recovery</h4>
                </div>
                <p className="text-sm md:text-base text-gray-700 mb-4">
                  Recover trading losses as business expenses and implement risk management strategies to protect your capital
                </p>
                {expandedCard === 'loss-recovery' && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-semibold mb-2">Loss Recovery Benefits:</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Deduct trading losses as business expenses</li>
                      <li>• Capital loss carryover for future tax years</li>
                      <li>• Risk management and stop-loss strategies</li>
                      <li>• Portfolio diversification techniques</li>
                      <li>• Professional trading education and tools</li>
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

      {/* Trading Metrics Examples */}
      <div className="w-full bg-white border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="text-lg font-bold tracking-wider text-gray-600">TRADING METRICS EXAMPLES</div>
            <div className="text-sm text-gray-400 flex items-center">
              <span>Real-world trading performance</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {[
              { title: '24h Volume', value: '$2.1B', subtitle: 'Trading volume', trend: '+12%' },
              { title: 'Active Traders', value: '45K', subtitle: 'Business accounts', trend: '+8%' },
              { title: 'Avg Profit', value: '23.4%', subtitle: 'Monthly return', trend: '+5%' },
              { title: 'Tax Savings', value: '$89K', subtitle: 'Annual savings', trend: '+15%' },
              { title: 'Loss Recovery', value: '67%', subtitle: 'Recovered losses', trend: '+7%' },
              { title: 'Trading Pairs', value: '156', subtitle: 'Available pairs', trend: '+3%' },
              { title: 'Execution Speed', value: '12ms', subtitle: 'Order execution', trend: '-8%' },
              { title: 'Success Rate', value: '78%', subtitle: 'Profitable trades', trend: '+4%' },
              { title: 'Risk Score', value: '2.3', subtitle: 'Portfolio risk', trend: '-12%' },
              { title: 'ROI', value: '34.7%', subtitle: 'Annual return', trend: '+9%' }
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

      {/* Trading Opening Costs Section */}
      <div className="w-full bg-gray-50 border-t-2 border-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold font-serif mb-2">Trading Opening Costs</h3>
            <p className="text-sm md:text-base text-gray-600">Choose your trading package and start your business trading journey</p>
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
                  <li>• Basic trading account</li>
                  <li>• Standard trading tools</li>
                  <li>• Basic tax guidance</li>
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
                <h4 className="text-xl font-bold font-serif mb-2">Starter Trading</h4>
                <div className="text-3xl font-bold mb-4">$1,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Advanced trading tools</li>
                  <li>• Tax optimization strategies</li>
                  <li>• Risk management tools</li>
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
                <h4 className="text-xl font-bold font-serif mb-2">Professional Trading</h4>
                <div className="text-3xl font-bold mb-4">$5,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• Full trading suite</li>
                  <li>• Custom tax strategies</li>
                  <li>• Automated trading bots</li>
                  <li>• Portfolio management</li>
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
                <h4 className="text-xl font-bold font-serif mb-2">Enterprise Trading</h4>
                <div className="text-3xl font-bold mb-4">$20,000</div>
                <ul className="text-sm space-y-2 text-left">
                  <li>• White-label solution</li>
                  <li>• Custom trading algorithms</li>
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

          {/* Tech Trading Title */}
          <div className="text-center mt-12">
            <h4 className="text-2xl md:text-3xl font-bold font-serif mb-4">Powered by Advanced Trading Technology</h4>
            <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
              Our trading solutions are built on cutting-edge technology, ensuring fast execution, 
              security, and maximum profitability for your business trading operations.
            </p>
            <div className="flex justify-center space-x-8 mt-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">BIN</span>
                </div>
                <span className="text-xs font-semibold">Binance</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">COIN</span>
                </div>
                <span className="text-xs font-semibold">Coinbase</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">KRA</span>
                </div>
                <span className="text-xs font-semibold">Kraken</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold text-sm">FTX</span>
                </div>
                <span className="text-xs font-semibold">FTX</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeMindMap;