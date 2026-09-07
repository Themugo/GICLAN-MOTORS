import React, { useState, useCallback, useEffect } from 'react';
import * as cmsApi from '../../../../services/cmsApi';
import { getCars } from '../../../../services/vehicleApi';
import {
  Type, Heading1, Heading2, Paragraph, Button, Image as ImageIcon,
  Video, Gallery, Car, Users, Banner, BarChart, MessageSquare,
  MapPin, Clock, Mail, List, Code, Box, Layout, GripVertical,
  Plus, Trash2, Copy, MoveUp, MoveDown, Eye, Save, Undo, Redo,
  Settings, ChevronDown, ChevronRight, Search, Monitor, Tablet, Smartphone
} from 'lucide-react';

// Design System Colors
const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
};

// Block Types with Icons and Default Content
const blockTypes = [
  {
    category: 'Layout',
    blocks: [
      { type: 'hero', label: 'Hero Section', icon: Layout, defaultProps: { title: 'Welcome to KAYAD', subtitle: 'Your trusted automotive marketplace', buttonText: 'Get Started', buttonLink: '/browse' } },
      { type: 'container', label: 'Container', icon: Box, defaultProps: { backgroundColor: '#FFFFFF', padding: 'large' } },
      { type: 'columns', label: 'Columns', icon: Layout, defaultProps: { columns: 2, gap: 'medium' } },
    ]
  },
  {
    category: 'Content',
    blocks: [
      { type: 'heading', label: 'Heading', icon: Heading1, defaultProps: { text: 'Section Heading', level: 'h2' } },
      { type: 'subheading', label: 'Subheading', icon: Heading2, defaultProps: { text: 'Subsection Title' } },
      { type: 'paragraph', label: 'Paragraph', icon: Paragraph, defaultProps: { text: 'Add your content here. Write engaging copy that captures attention.' } },
      { type: 'html', label: 'HTML Block', icon: Code, defaultProps: { html: '<div>Custom HTML content</div>' } },
    ]
  },
  {
    category: 'Media',
    blocks: [
      { type: 'image', label: 'Image', icon: ImageIcon, defaultProps: { src: '', alt: 'Image description', caption: '' } },
      { type: 'video', label: 'Video', icon: Video, defaultProps: { url: '', autoplay: false, loop: false } },
      { type: 'gallery', label: 'Gallery', icon: Gallery, defaultProps: { images: [], columns: 3 } },
    ]
  },
  {
    category: 'Interactive',
    blocks: [
      { type: 'button', label: 'Button', icon: Button, defaultProps: { text: 'Click Me', link: '/', style: 'primary' } },
      { type: 'faq', label: 'FAQ Accordion', icon: MessageSquare, defaultProps: { items: [] } },
      { type: 'countdown', label: 'Countdown Timer', icon: Clock, defaultProps: { endDate: '', message: 'Event Started!' } },
      { type: 'newsletter', label: 'Newsletter Signup', icon: Mail, defaultProps: { title: 'Stay Updated', description: 'Subscribe to our newsletter', buttonText: 'Subscribe' } },
    ]
  },
  {
    category: 'KAYAD Specific',
    blocks: [
      { type: 'vehicleCarousel', label: 'Vehicle Carousel', icon: Car, defaultProps: { title: 'Featured Vehicles', vehicles: [], limit: 6 } },
      { type: 'dealerCarousel', label: 'Dealer Carousel', icon: Users, defaultProps: { title: 'Top Dealers', dealers: [], limit: 4 } },
      { type: 'auctionBanner', label: 'Auction Banner', icon: Banner, defaultProps: { title: 'Live Auction', subtitle: 'Bid now on premium vehicles', ctaText: 'View Auction', ctaLink: '/auctions' } },
      { type: 'inspectionBanner', label: 'Inspection Banner', icon: Car, defaultProps: { title: 'Professional Inspection', subtitle: 'Get your vehicle inspected', ctaText: 'Book Now', ctaLink: '/inspections' } },
      { type: 'financeBanner', label: 'Finance Banner', icon: BarChart, defaultProps: { title: 'Easy Financing', subtitle: 'Get approved today', ctaText: 'Apply Now', ctaLink: '/financing' } },
      { type: 'statistics', label: 'Statistics', icon: BarChart, defaultProps: { stats: [{ value: '10,000+', label: 'Vehicles' }, { value: '500+', label: 'Dealers' }] } },
      { type: 'testimonials', label: 'Testimonials', icon: MessageSquare, defaultProps: { testimonials: [] } },
      { type: 'pricingTable', label: 'Pricing Table', icon: List, defaultProps: { plans: [] } },
      { type: 'map', label: 'Map', icon: MapPin, defaultProps: { center: '', zoom: 14 } },
    ]
  },
];

// Block Component Renderer
const BlockRenderer = ({ block, isEditing, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, onSelect, isSelected, liveVehicles }) => {
  const [expanded, setExpanded] = useState(false);

  const getBlockIcon = (type) => {
    const blockType = blockTypes.flatMap(c => c.blocks).find(b => b.type === type);
    return blockType?.icon || Box;
  };

  const Icon = getBlockIcon(block.type);

  const renderBlockContent = () => {
    switch (block.type) {
      case 'hero':
        return (
          <div className="bg-gradient-to-r from-[#17244B] to-[#2a3d6b] rounded-lg p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{block.props.title}</h1>
            <p className="text-lg opacity-90 mb-4">{block.props.subtitle}</p>
            <button className="px-6 py-2 bg-[#C77B58] rounded-lg font-medium hover:bg-[#b06a48] transition-colors">
              {block.props.buttonText}
            </button>
          </div>
        );
      case 'heading': {
        const HeadingTag = block.props.level || 'h2';
        return <HeadingTag className="text-2xl font-bold text-slate-800">{block.props.text}</HeadingTag>;
      }
      case 'paragraph':
        return <p className="text-slate-600 leading-relaxed">{block.props.text}</p>;
      case 'image':
        return (
          <div className="rounded-lg overflow-hidden">
            {block.props.src ? (
              <img src={block.props.src} alt={block.props.alt} className="w-full h-auto" />
            ) : (
              <div className="bg-slate-100 h-48 flex items-center justify-center">
                <ImageIcon className="text-slate-400" size={48} />
              </div>
            )}
            {block.props.caption && (
              <p className="text-sm text-slate-500 mt-2 text-center">{block.props.caption}</p>
            )}
          </div>
        );
      case 'button': {
        const buttonStyles = {
          primary: 'bg-[#17244B] text-white hover:bg-[#1e3054]',
          secondary: 'bg-white text-[#17244B] border border-[#17244B] hover:bg-slate-50',
          accent: 'bg-[#C77B58] text-white hover:bg-[#b06a48]',
        };
        return (
          <button className={`px-6 py-3 rounded-lg font-medium transition-colors ${buttonStyles[block.props.style] || buttonStyles.primary}`}>
            {block.props.text}
          </button>
        );
      }
      case 'vehicleCarousel':
        return (
          <div className="bg-slate-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">{block.props.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(liveVehicles || []).map((vehicle) => (
                <div key={vehicle.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <img src={vehicle.image || vehicle.images?.[0] || '/placeholder.jpg'} alt={vehicle.title || `${vehicle.make || ''} ${vehicle.model || ''}`} className="w-full h-24 object-cover rounded mb-2" />
                  <div className="text-sm font-medium text-slate-700">{vehicle.title || `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Vehicle'}</div>
                  <div className="text-xs text-slate-500">{vehicle.price ? `KSh ${Number(vehicle.price).toLocaleString()}` : 'Price on request'}</div>
                </div>
              ))}
              {(!liveVehicles || liveVehicles.length === 0) && <div className="col-span-full text-sm text-slate-400">No live vehicles match this block yet.</div>}
            </div>
          </div>
        );
      case 'statistics':
        return (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {(block.props.stats || []).map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-[#17244B]">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'auctionBanner':
      case 'inspectionBanner':
      case 'financeBanner': {
        const bgColors = {
          auctionBanner: 'from-purple-600 to-purple-800',
          inspectionBanner: 'from-emerald-600 to-emerald-800',
          financeBanner: 'from-blue-600 to-blue-800',
        };
        return (
          <div className={`bg-gradient-to-r ${bgColors[block.type]} rounded-lg p-6 text-white`}>
            <h3 className="text-xl font-bold mb-1">{block.props.title}</h3>
            <p className="opacity-90 mb-3">{block.props.subtitle}</p>
            <button className="px-4 py-2 bg-white/20 rounded-lg font-medium hover:bg-white/30 transition-colors">
              {block.props.ctaText}
            </button>
          </div>
        );
      }
      case 'container':
        return (
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center text-slate-400">
            Container Block
          </div>
        );
      default:
        return (
          <div className="bg-slate-50 rounded-lg p-4 text-slate-500 text-center">
            {block.type} Block
          </div>
        );
    }
  };

  return (
    <div onClick={onSelect} className={`group relative rounded-lg border-2 transition-all cursor-pointer ${isSelected ? 'border-[#C77B58] ring-2 ring-[#C77B58]/20' : isEditing ? 'border-[#17244B] ring-2 ring-[#17244B]/20' : 'border-transparent hover:border-slate-200'}`}>
      {/* Block Controls */}
      {isEditing && (
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-between bg-[#17244B] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-white/20 text-white" title="Drag to reorder">
              <GripVertical size={14} />
            </button>
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1.5 rounded hover:bg-white/20 text-white disabled:opacity-30"
              title="Move up"
            >
              <MoveUp size={14} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1.5 rounded hover:bg-white/20 text-white disabled:opacity-30"
              title="Move down"
            >
              <MoveDown size={14} />
            </button>
            <button className="p-1.5 rounded hover:bg-white/20 text-white" title="Duplicate">
              <Copy size={14} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-500 text-white" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
          <div className="flex items-center gap-1 text-white text-xs">
            <Icon size={12} />
            <span>{block.type}</span>
          </div>
        </div>
      )}

      {/* Block Content */}
      <div className="p-4">
        {renderBlockContent()}
      </div>
    </div>
  );
};

export default function VisualPageBuilder({ page = null, onSaved = null }) {
  const initialBlocks = Array.isArray(page?.content) ? page.content : [];
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isEditing, setIsEditing] = useState(true);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [history, setHistory] = useState([initialBlocks]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [searchBlocks, setSearchBlocks] = useState('');
  const [liveVehicles, setLiveVehicles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setBlocks(initialBlocks);
    setHistory([initialBlocks]);
    setHistoryIndex(0);
    setSelectedBlock(null);
  }, [page?.id]);

  useEffect(() => {
    let active = true;
    getCars({ page: 1, limit: 6, status: 'active' }).then((result) => {
      if (active) setLiveVehicles(result?.data || []);
    }).catch(() => { if (active) setLiveVehicles([]); });
    return () => { active = false; };
  }, []);

  const commitBlocks = useCallback((newBlocks) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newBlocks]);
    setHistoryIndex(prev => prev + 1);
    setBlocks(newBlocks);
  }, [historyIndex]);

  const addBlock = (blockType) => {
    const blockDef = blockTypes.flatMap(c => c.blocks).find(b => b.type === blockType);
    if (!blockDef) return;

    const newBlock = {
      id: `block_${Date.now()}`,
      type: blockType,
      props: { ...blockDef.defaultProps },
    };

    const newBlocks = selectedBlock !== null
      ? [...blocks.slice(0, selectedBlock + 1), newBlock, ...blocks.slice(selectedBlock + 1)]
      : [...blocks, newBlock];

    commitBlocks(newBlocks);
    setSelectedBlock(selectedBlock !== null ? selectedBlock + 1 : blocks.length);
  };

  const updateBlock = (index, newProps) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], props: { ...newBlocks[index].props, ...newProps } };
    commitBlocks(newBlocks);
  };

  const deleteBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    commitBlocks(newBlocks);
    setSelectedBlock(null);
  };

  const moveBlock = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    commitBlocks(newBlocks);
    setSelectedBlock(newIndex);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setBlocks([...history[historyIndex - 1]]);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setBlocks([...history[historyIndex + 1]]);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const savePage = async () => {
    if (!page?.id) {
      setSaveError('Select a page before saving.');
      return;
    }
    try {
      setSaving(true);
      setSaveError('');
      const response = await cmsApi.updatePage(page.id, { content: blocks });
      onSaved?.(response?.data || response);
    } catch (error) {
      setSaveError(error?.response?.data?.error || error?.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const filteredBlocks = blockTypes.map(category => ({
    ...category,
    blocks: category.blocks.filter(block =>
      block.label.toLowerCase().includes(searchBlocks.toLowerCase())
    )
  })).filter(category => category.blocks.length > 0);

  return (
    <div className="flex h-screen bg-[#F6F1E8]">
      {/* Block Library Panel */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Block Library</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search blocks..."
              value={searchBlocks}
              onChange={(e) => setSearchBlocks(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {filteredBlocks.map((category) => (
            <div key={category.category}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.blocks.map((block) => {
                  const Icon = block.icon;
                  return (
                    <button
                      key={block.type}
                      onClick={() => addBlock(block.type)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-[#17244B] hover:bg-[#17244B]/5 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon size={16} className="text-slate-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{block.label}</span>
                      <Plus size={14} className="ml-auto text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Canvas */}
      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo size={18} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo size={18} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isEditing ? 'bg-[#17244B] text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {isEditing ? 'Editing' : 'Viewing'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                title="Desktop"
              >
                <Monitor size={16} />
              </button>
              <button
                onClick={() => setPreviewMode('tablet')}
                className={`p-2 rounded ${previewMode === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                title="Tablet"
              >
                <Tablet size={16} />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                title="Mobile"
              >
                <Smartphone size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium">
              <Eye size={16} />
              Preview
            </button>
            <button onClick={savePage} disabled={saving || !page?.id} className="px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054] flex items-center gap-2 text-sm font-medium disabled:opacity-40">
              <Save size={16} />
              {saving ? 'Saving…' : 'Save Page'}
            </button>
          </div>
        </div>

        {saveError && <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{saveError}</div>}

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className={`mx-auto bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300 ${previewMode === 'desktop' ? 'w-full max-w-6xl' : previewMode === 'tablet' ? 'w-[768px]' : 'w-[375px]'}`}>
            <div className="min-h-[600px] p-6">
              {blocks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                  <Layout size={48} className="mb-4" />
                  <p className="text-lg font-medium mb-2">Start Building Your Page</p>
                  <p className="text-sm">Click on blocks from the left panel to add them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {blocks.map((block, index) => (
                    <BlockRenderer
                      key={block.id}
                      block={block}
                      isEditing={isEditing}
                      isFirst={index === 0}
                      isLast={index === blocks.length - 1}
                      onUpdate={(props) => updateBlock(index, props)}
                      onDelete={() => deleteBlock(index)}
                      onMoveUp={() => moveBlock(index, 'up')}
                      onMoveDown={() => moveBlock(index, 'down')}
                      onSelect={() => setSelectedBlock(index)}
                      isSelected={selectedBlock === index}
                      liveVehicles={liveVehicles}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Properties Panel */}
      {selectedBlock !== null && blocks[selectedBlock] && (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Block Properties</h2>
            <button
              onClick={() => setSelectedBlock(null)}
              className="p-1 rounded hover:bg-slate-100"
            >
              <Trash2 size={16} className="text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {Object.entries(blocks[selectedBlock].props).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-600 mb-1 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                {typeof value === 'string' ? (
                  key === 'html' ? (
                    <textarea
                      value={value}
                      onChange={(e) => updateBlock(selectedBlock, { [key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                      rows={4}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateBlock(selectedBlock, { [key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none"
                    />
                  )
                ) : typeof value === 'boolean' ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => updateBlock(selectedBlock, { [key]: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-500">{value ? 'Enabled' : 'Disabled'}</span>
                  </label>
                ) : typeof value === 'number' ? (
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => updateBlock(selectedBlock, { [key]: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none"
                  />
                ) : (
                  <pre className="text-xs bg-slate-50 p-2 rounded overflow-auto">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
