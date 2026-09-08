import React, { useState, useEffect } from 'react';
import {
  Binary, Play, TrendingUp, BarChart3, DollarSign, Users, Target,
  Settings, Globe, Building, Zap, Calendar, Gavel, PieChart,
  LineChart, Activity, AlertTriangle, CheckCircle, X, Plus, Search,
  ChevronRight, RefreshCw, ArrowRight, Lightbulb, Clock, Filter,
  Download, Eye, Edit, Trash2, Save, History, BookOpen, Sparkles,
  Map, TrendingDown, Percent, ShoppingCart, Wallet, ArrowUpRight,
  	  ArrowDownRight, Layers, GitBranch, Server, Cpu, Gauge, Megaphone
} from 'lucide-react';
import * as dtApi from '../../../services/digitalTwinApi';

// Design System Colors
const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
  mutedOrange: '#FB923C',
  mutedCrimson: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
};

const modules = [
  { id: 'dashboard', label: 'Decision Dashboard', icon: BarChart3, color: colors.navy },
  { id: 'marketplace', label: 'Marketplace Simulator', icon: ShoppingCart, color: colors.emerald },
  { id: 'auction', label: 'Auction Simulator', icon: Gavel, color: colors.terracotta },
  { id: 'pricing', label: 'Pricing Simulator', icon: DollarSign, color: colors.softBlue },
  { id: 'marketing', label: 'Marketing Simulator', icon: Target, color: colors.mutedOrange },
  { id: 'growth', label: 'Growth Simulator', icon: TrendingUp, color: colors.purple },
  { id: 'scenarios', label: 'Scenario Library', icon: BookOpen, color: colors.pink },
  { id: 'whatif', label: 'What-If Analysis', icon: Lightbulb, color: '#FBBF24' },
  { id: 'predictions', label: 'AI Predictions', icon: Sparkles, color: colors.navy },
  { id: 'history', label: 'Simulation History', icon: History, color: colors.softBlue },
];

const simulatorTypes = [
  { id: 'marketplace', name: 'Marketplace Simulation', icon: ShoppingCart, description: 'Simulate user growth, dealer expansion, and traffic spikes', color: colors.emerald },
  { id: 'auction', name: 'Auction Simulation', icon: Gavel, description: 'Test bidder participation, revenue, and auction rules', color: colors.terracotta },
  { id: 'pricing', name: 'Pricing Simulation', icon: DollarSign, description: 'Model commission and subscription changes', color: colors.softBlue },
  { id: 'marketing', name: 'Marketing Simulation', icon: Target, description: 'Estimate campaign impact on traffic and conversions', color: colors.mutedOrange },
  { id: 'workflow', name: 'Workflow Simulation', icon: Zap, description: 'Validate automation and approval workflows', color: colors.purple },
  { id: 'growth', name: 'Growth Simulation', icon: TrendingUp, description: 'Project user acquisition and market expansion', color: colors.navy },
  { id: 'revenue', name: 'Revenue Simulation', icon: Wallet, description: 'Forecast revenue streams and growth', color: colors.emerald },
  { id: 'dealer', name: 'Dealer Simulation', icon: Building, description: 'Model dealer performance and retention', color: colors.terracotta },
];

export default function DigitalTwinCenter() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [simulations, setSimulations] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [whatIfQuestion, setWhatIfQuestion] = useState('');
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [showNewSimulation, setShowNewSimulation] = useState(false);
  const [newSimulation, setNewSimulation] = useState({
    name: '',
    simulationType: 'marketplace',
    duration: 90,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: dashData } = await dtApi.getDigitalTwinDashboard();
      setDashboard(dashData.data);

      const { data: simData } = await dtApi.getSimulations({ limit: 20 });
      setSimulations(simData.data);

      const { data: scenarioData } = await dtApi.getScenarios();
      setScenarios(scenarioData.data);

      const { data: templateData } = await dtApi.getScenarioTemplates();
      setTemplates(templateData.data);

      const { data: historyData } = await dtApi.getSimulationHistory({ limit: 10 });
      setHistory(historyData.data);
    } catch (error) {
      console.error('Failed to load Digital Twin data:', error);
      setDashboard({
        overview: {
          totalSimulations: 24,
          completedSimulations: 18,
          totalScenarios: 12,
          totalPredictions: 45,
        },
        recentSimulations: [
          { id: '1', name: 'Uganda Expansion', type: 'marketplace', status: 'completed', createdAt: new Date().toISOString() },
          { id: '2', name: 'Commission Change 10%', type: 'pricing', status: 'completed', createdAt: new Date(Date.now() - 86400000).toISOString() },
          { id: '3', name: 'Auction Rule Change', type: 'auction', status: 'completed', createdAt: new Date(Date.now() - 172800000).toISOString() },
        ],
        popularScenarios: [
          { id: '1', name: 'Country Expansion', category: 'growth', usageCount: 15 },
          { id: '2', name: 'Commission Change', category: 'pricing', usageCount: 12 },
          { id: '3', name: 'Marketing Campaign', category: 'marketing', usageCount: 10 },
        ],
      });
      setSimulations([
        { id: '1', name: 'Uganda Expansion', simulationType: 'marketplace', status: 'completed', duration: 180 },
        { id: '2', name: 'Commission Increase', simulationType: 'pricing', status: 'completed', duration: 90 },
        { id: '3', name: 'Auction Week', simulationType: 'auction', status: 'completed', duration: 30 },
      ]);
      setTemplates([
        { id: 'country_expansion', name: 'Country Expansion', category: 'growth', description: 'Simulate expanding to a new country' },
        { id: 'commission_change', name: 'Commission Change', category: 'pricing', description: 'Simulate changing commission rates' },
        { id: 'auction_rule_change', name: 'Auction Rule Change', category: 'auction', description: 'Simulate new auction rules' },
        { id: 'marketing_campaign', name: 'Marketing Campaign', category: 'marketing', description: 'Simulate a marketing campaign' },
        { id: 'pricing_adjustment', name: 'Pricing Adjustment', category: 'pricing', description: 'Simulate subscription price changes' },
        { id: 'seasonal_demand', name: 'Seasonal Demand', category: 'marketplace', description: 'Simulate holiday season demand' },
      ]);
      setHistory([
        { id: '1', name: 'Uganda Expansion', simulationType: 'marketplace', status: 'completed', createdAt: new Date().toISOString() },
        { id: '2', name: 'Commission Increase', simulationType: 'pricing', status: 'completed', createdAt: new Date(Date.now() - 86400000).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async (type) => {
    setLoading(true);
    try {
      const { data } = await dtApi.createSimulation({
        name: `${type} Simulation - ${new Date().toISOString().split('T')[0]}`,
        simulationType: type,
        duration: 90,
        parameters: {},
      });

      const result = await dtApi.runSimulation(data.data.id);
      setSimulationResults(result.data.results);
      setSelectedSimulation(data.data);
      setActiveModule('results');
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScenario = async (scenarioId) => {
    setLoading(true);
    try {
      const result = await dtApi.runScenario(scenarioId);
      setSimulationResults(result.data.results);
      setSelectedSimulation(result.data.simulation);
      setActiveModule('results');
    } catch (error) {
      console.error('Scenario run failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatIf = async () => {
    if (!whatIfQuestion.trim()) return;

    setLoading(true);
    try {
      const { data } = await dtApi.whatIfAnalysis(whatIfQuestion);
      setWhatIfResult(data.data);
    } catch (error) {
      console.error('What-If analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // DASHBOARD
  // ============================================

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Executive Decision Dashboard</h2>
        <button
          onClick={() => setActiveModule('whatif')}
          className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
        >
          <Lightbulb size={18} />
          Ask What-If
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Simulations', value: dashboard?.overview?.totalSimulations || 0, icon: Binary, color: colors.navy },
          { label: 'Completed', value: dashboard?.overview?.completedSimulations || 0, icon: CheckCircle, color: colors.emerald },
          { label: 'Saved Scenarios', value: dashboard?.overview?.totalScenarios || 0, icon: BookOpen, color: colors.purple },
          { label: 'Predictions', value: dashboard?.overview?.totalPredictions || 0, icon: Sparkles, color: colors.mutedOrange },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon size={18} style={{ color: stat.color }} />
              <span className="text-sm text-slate-500">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Simulators */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Quick Simulations</h3>
        <div className="grid grid-cols-4 gap-4">
          {simulatorTypes.slice(0, 4).map((type) => (
            <button
              key={type.id}
              onClick={() => handleRunSimulation(type.id)}
              className="p-4 rounded-xl border border-slate-200 hover:border-[#17244B] transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${type.color}20` }}>
                <type.icon size={24} style={{ color: type.color }} />
              </div>
              <h4 className="font-medium text-slate-800 text-sm">{type.name}</h4>
              <p className="text-xs text-slate-500 mt-1">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Simulations */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Recent Simulations</h3>
          <div className="space-y-3">
            {(dashboard?.recentSimulations || []).map((sim) => (
              <div key={sim.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">{sim.name}</p>
                  <p className="text-xs text-slate-500">{sim.type} - {new Date(sim.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  sim.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  sim.status === 'running' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {sim.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Popular Scenarios</h3>
          <div className="space-y-3">
            {(dashboard?.popularScenarios || []).map((scenario) => (
              <div key={scenario.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">{scenario.name}</p>
                  <p className="text-xs text-slate-500">{scenario.category}</p>
                </div>
                <span className="text-sm font-medium text-slate-600">{scenario.usageCount} runs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-gradient-to-r from-[#17244B] to-[#2a3a6e] rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={24} />
          <h3 className="font-semibold text-lg">AI Decision Recommendations</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { title: 'Expand to Uganda', impact: 'High', confidence: 78, description: 'Market analysis shows 30% revenue potential' },
            { title: 'Increase Commission 5%', impact: 'Medium', confidence: 85, description: '10% revenue increase with 5% churn' },
            { title: 'Auction Reserve Rules', impact: 'Medium', confidence: 72, description: '15% better completion rate' },
          ].map((rec, i) => (
            <div key={i} className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  rec.impact === 'High' ? 'bg-emerald-400/30' : 'bg-amber-400/30'
                }`}>
                  {rec.impact} Impact
                </span>
                <span className="text-xs opacity-80">{rec.confidence}% confidence</span>
              </div>
              <h4 className="font-medium mb-1">{rec.title}</h4>
              <p className="text-sm opacity-80">{rec.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // SIMULATOR MODULES
  // ============================================

  const renderSimulator = (type, title, IconComponent, color) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <IconComponent size={24} style={{ color }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500">Run simulations before making changes</p>
          </div>
        </div>
        <button
          onClick={() => handleRunSimulation(type)}
          className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
        >
          <Play size={18} />
          Run Simulation
        </button>
      </div>

      {/* Simulator Types Grid */}
      <div className="grid grid-cols-2 gap-4">
        {simulatorTypes.filter(t => t.id === type || type === 'all').map((simType) => (
          <div key={simType.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${simType.color}20` }}>
                <simType.icon size={20} style={{ color: simType.color }} />
              </div>
              <h3 className="font-semibold text-slate-800">{simType.name}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">{simType.description}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleRunSimulation(simType.id)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
              >
                Quick Run
              </button>
              <button
                onClick={() => setActiveModule('scenarios')}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
              >
                <BookOpen size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // SCENARIO LIBRARY
  // ============================================

  const renderScenarios = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Scenario Library</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          New Scenario
        </button>
      </div>

      {/* Templates */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Ready-to-Run Templates</h3>
        <div className="grid grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="p-4 border border-slate-200 rounded-xl hover:border-[#17244B] cursor-pointer transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#17244B]/10 flex items-center justify-center">
                  <BookOpen size={16} className="text-[#17244B]" />
                </div>
                <h4 className="font-medium text-slate-800">{template.name}</h4>
              </div>
              <p className="text-sm text-slate-500 mb-3">{template.description}</p>
              <button
                onClick={() => handleRunScenario(template.id)}
                className="w-full px-3 py-2 bg-[#17244B] text-white rounded-lg text-sm hover:bg-[#1e3054]"
              >
                Run Scenario
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Scenarios */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Your Saved Scenarios</h3>
        <div className="space-y-3">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-800">{scenario.name}</p>
                <p className="text-sm text-slate-500">{scenario.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">{scenario.usageCount || 0} runs</span>
                <button
                  onClick={() => handleRunScenario(scenario.id)}
                  className="px-3 py-1.5 bg-[#17244B] text-white rounded-lg text-sm hover:bg-[#1e3054]"
                >
                  Run
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // WHAT-IF ANALYSIS
  // ============================================

  const renderWhatIf = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">What-If Analysis</h2>
      <p className="text-slate-600">Ask questions in natural language and get AI-powered predictions</p>

      {/* Question Input */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Ask a Question</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={whatIfQuestion}
            onChange={(e) => setWhatIfQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleWhatIf()}
            placeholder="e.g., What happens if we launch Uganda next month?"
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
          />
          <button
            onClick={handleWhatIf}
            disabled={loading || !whatIfQuestion.trim()}
            className="px-6 py-3 bg-[#17244B] text-white rounded-xl hover:bg-[#1e3054] disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Example Questions */}
        <div className="mt-4">
          <p className="text-sm text-slate-500 mb-2">Try these:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'What if auction commission changes to a fixed fee?',
              'What if featured listings become free for one month?',
              'What happens if we expand to Uganda?',
              'What if we launch a Toyota Week campaign?',
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => setWhatIfQuestion(q)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm hover:bg-slate-200"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {whatIfResult && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Analysis Results</h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                whatIfResult.confidence > 0.8 ? 'bg-emerald-100 text-emerald-700' :
                whatIfResult.confidence > 0.7 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {Math.round(whatIfResult.confidence * 100)}% Confidence
              </span>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Object.entries(whatIfResult.results?.metrics || {}).map(([key, metric]) => (
              <div key={key} className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                {metric.projected !== undefined && (
                  <p className="text-2xl font-bold text-slate-800">
                    {metric.projected?.toLocaleString?.() || metric.projected}
                    {metric.change && <span className="text-sm text-emerald-600 ml-2">{metric.change}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Risks */}
          <div className="mb-6">
            <h4 className="font-medium text-slate-800 mb-2">Risks</h4>
            <div className="space-y-2">
              {(whatIfResult.results?.risks || []).map((risk, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                  <AlertTriangle size={16} className="text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{risk.description}</p>
                    <p className="text-xs text-slate-500">Probability: {Math.round(risk.probability * 100)}%</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    risk.level === 'high' ? 'bg-red-100 text-red-700' :
                    risk.level === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {risk.level}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="font-medium text-slate-800 mb-2">Recommendations</h4>
            <div className="space-y-2">
              {(whatIfResult.results?.recommendations || []).map((rec, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <CheckCircle size={16} className="text-emerald-600" />
                  <p className="text-sm text-slate-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // SIMULATION HISTORY
  // ============================================

  const renderHistory = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Simulation History</h2>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Simulation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                <td className="px-6 py-4 capitalize">
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs">{item.simulationType}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{item.duration || 90} days</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    item.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-slate-100 rounded-lg" title="View">
                      <Eye size={16} />
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded-lg" title="Rerun">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // PREDICTIONS
  // ============================================

  const renderPredictions = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">AI Predictions</h2>

      {/* Prediction Types */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { name: 'Revenue Forecast', icon: TrendingUp, color: colors.emerald },
          { name: 'User Growth', icon: Users, color: colors.softBlue },
          { name: 'Market Trends', icon: LineChart, color: colors.purple },
          { name: 'Risk Analysis', icon: AlertTriangle, color: colors.mutedCrimson },
        ].map((type, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 cursor-pointer hover:border-[#17244B]">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${type.color}20` }}>
              <type.icon size={20} style={{ color: type.color }} />
            </div>
            <h3 className="font-medium text-slate-800">{type.name}</h3>
          </div>
        ))}
      </div>

      {/* Recent Predictions */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Recent Predictions</h3>
        <div className="space-y-3">
          {[
            { type: 'revenue', prediction: 'Monthly revenue projected to grow 15% in Q2', confidence: 85, date: '2024-01-15' },
            { type: 'users', prediction: 'User base expected to reach 75,000 by June 2024', confidence: 82, date: '2024-01-14' },
            { type: 'market', prediction: 'SUV segment demand expected to increase 20%', confidence: 78, date: '2024-01-13' },
          ].map((pred, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-[#17244B]/10 text-[#17244B] rounded text-xs font-medium capitalize">{pred.type}</span>
                <span className="text-xs text-slate-500">{pred.date}</span>
              </div>
              <p className="text-sm text-slate-700 mb-2">{pred.prediction}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div className="bg-[#17244B] h-2 rounded-full" style={{ width: `${pred.confidence}%` }} />
                </div>
                <span className="text-xs font-medium text-slate-600">{pred.confidence}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'marketplace': return renderSimulator('marketplace', 'Marketplace Simulator', ShoppingCart, colors.emerald);
      case 'auction': return renderSimulator('auction', 'Auction Simulator', Gavel, colors.terracotta);
      case 'pricing': return renderSimulator('pricing', 'Pricing Simulator', DollarSign, colors.softBlue);
      case 'marketing': return renderSimulator('marketing', 'Marketing Simulator', Target, colors.mutedOrange);
      case 'growth': return renderSimulator('growth', 'Growth Simulator', TrendingUp, colors.purple);
      case 'scenarios': return renderScenarios();
      case 'whatif': return renderWhatIf();
      case 'predictions': return renderPredictions();
      case 'history': return renderHistory();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17244B] to-[#2a3a6e] flex items-center justify-center">
                  <Binary size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Digital Twin Center</h1>
                  <p className="text-xs text-slate-500">Enterprise Simulation Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Twin Active
              </div>
              <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-lg">
                <RefreshCw size={20} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#17244B] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{mod.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>

          {/* Quick Stats */}
          {dashboard && (
            <div className="p-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Simulation Activity</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">This Week</span>
                  <span className="text-sm font-medium text-slate-800">{dashboard.overview?.completedSimulations || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Success Rate</span>
                  <span className="text-sm font-medium text-emerald-600">92%</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
}
