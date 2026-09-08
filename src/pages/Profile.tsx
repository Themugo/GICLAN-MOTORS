import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Shield, Bell, Lock, LogOut, Star, Clock, ChevronRight, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatKES } from '../utils/helpers';

interface ProfileProps {
  setPage: (page: string) => void;
  authUser?: any;
}

export default function Profile({ setPage, authUser }: ProfileProps) {
  const { user: authUser2, logout, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);

  // Use auth context user or prop
  const user = authUser2 || authUser || {
    name: 'Guest User',
    email: '',
    phone: '',
    location: '',
    createdAt: new Date().toISOString(),
    avatar: null,
  };

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const stats = [
    { label: 'Listings', value: user.listingsCount || '0' },
    { label: 'Purchases', value: user.purchasesCount || '0' },
    { label: 'Escrows', value: user.escrowsCount || '0' },
  ];

  const menuItems = [
    { key: 'info', label: 'Personal Info', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Lock },
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await logout();
      navigate('/');
    }
  };

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;
    setLoading(true);
    try {
      await updateProfile({ [editingField]: editValue });
      toast('Profile updated successfully', 'success');
      setEditingField(null);
    } catch (err) {
      toast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const memberYear = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="bg-charcoal-900 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 bg-gold-500/20 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-gold-400">
                    {user.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center text-charcoal-900 hover:bg-gold-600 transition-colors">
                <Camera size={14} />
              </button>
            </div>

            {/* Info */}
            <div>
              <h1 className="font-serif text-2xl text-white font-bold">{user.name}</h1>
              <p className="text-white/50 text-sm flex items-center gap-2 mt-1">
                <Clock size={12} />
                Member since {memberYear}
              </p>
              {user.rating && (
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={14} className={i <= (user.rating || 0) ? 'text-gold-400 fill-current' : 'text-white/30'} />
                  ))}
                  <span className="text-white/50 text-xs ml-1">({user.reviewsCount || 0} reviews)</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {stats.map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-4 text-center">
                <p className="font-serif text-2xl text-gold-400 font-bold">{value}</p>
                <p className="text-white/50 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl border border-cream-200 p-4 sticky top-24">
              {menuItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    activeTab === key
                      ? 'bg-gold-500 text-charcoal-900'
                      : 'text-charcoal-800 hover:bg-cream-50'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-sans text-sm font-semibold">{label}</span>
                </button>
              ))}
              <div className="mt-4 pt-4 border-t border-cream-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="font-sans text-sm font-semibold">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="md:col-span-3">
            {activeTab === 'info' && (
              <div className="bg-white rounded-2xl border border-cream-200 p-6">
                <h2 className="font-serif text-xl text-charcoal-900 font-bold mb-6">Personal Information</h2>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-cream-50 rounded-xl">
                    <div className="w-10 h-10 bg-gold-500/10 rounded-lg flex items-center justify-center">
                      <User size={18} className="text-gold-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block font-sans text-xs text-warm-400 font-semibold uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      {editingField === 'name' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="font-sans text-sm text-charcoal-900 border border-cream-300 rounded px-2 py-1"
                          />
                          <button onClick={handleSaveEdit} disabled={loading} className="text-gold-600 text-sm font-semibold">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <p className="font-sans text-sm text-charcoal-900">{user.name}</p>
                      )}
                    </div>
                    {!editingField && (
                      <button onClick={() => handleEdit('name', user.name || '')} className="text-gold-600 text-sm font-semibold hover:text-gold-700">Edit</button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-cream-50 rounded-xl">
                    <div className="w-10 h-10 bg-gold-500/10 rounded-lg flex items-center justify-center">
                      <Mail size={18} className="text-gold-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block font-sans text-xs text-warm-400 font-semibold uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <p className="font-sans text-sm text-charcoal-900">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-cream-50 rounded-xl">
                    <div className="w-10 h-10 bg-gold-500/10 rounded-lg flex items-center justify-center">
                      <Phone size={18} className="text-gold-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block font-sans text-xs text-warm-400 font-semibold uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      {editingField === 'phone' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="tel"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="font-sans text-sm text-charcoal-900 border border-cream-300 rounded px-2 py-1"
                          />
                          <button onClick={handleSaveEdit} disabled={loading} className="text-gold-600 text-sm font-semibold">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <p className="font-sans text-sm text-charcoal-900">{user.phone || 'Not set'}</p>
                      )}
                    </div>
                    {!editingField && (
                      <button onClick={() => handleEdit('phone', user.phone || '')} className="text-gold-600 text-sm font-semibold hover:text-gold-700">Edit</button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-cream-50 rounded-xl">
                    <div className="w-10 h-10 bg-gold-500/10 rounded-lg flex items-center justify-center">
                      <MapPin size={18} className="text-gold-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block font-sans text-xs text-warm-400 font-semibold uppercase tracking-wider mb-1">
                        Location
                      </label>
                      {editingField === 'location' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="font-sans text-sm text-charcoal-900 border border-cream-300 rounded px-2 py-1"
                          />
                          <button onClick={handleSaveEdit} disabled={loading} className="text-gold-600 text-sm font-semibold">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <p className="font-sans text-sm text-charcoal-900">{user.location || 'Not set'}</p>
                      )}
                    </div>
                    {!editingField && (
                      <button onClick={() => handleEdit('location', user.location || '')} className="text-gold-600 text-sm font-semibold hover:text-gold-700">Edit</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-cream-200 p-6">
                <h2 className="font-serif text-xl text-charcoal-900 font-bold mb-6">Notification Preferences</h2>

                <div className="space-y-4">
                  {[
                    { label: 'New bids on my listings', desc: 'Get notified when someone places a bid', key: 'new_bids', enabled: user.notifications?.newBids ?? true },
                    { label: 'Escrow updates', desc: 'Payment and delivery notifications', key: 'escrow', enabled: user.notifications?.escrow ?? true },
                    { label: 'Messages', desc: 'New messages from buyers or sellers', key: 'messages', enabled: user.notifications?.messages ?? true },
                    { label: 'Price alerts', desc: 'Vehicles you saved dropped in price', key: 'price_alerts', enabled: user.notifications?.priceAlerts ?? false },
                    { label: 'Newsletter', desc: 'Weekly market updates and new listings', key: 'newsletter', enabled: user.notifications?.newsletter ?? false },
                  ].map(({ label, desc, key, enabled }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-cream-50 rounded-xl">
                      <div>
                        <p className="font-sans text-sm font-semibold text-charcoal-900">{label}</p>
                        <p className="font-sans text-xs text-warm-400 mt-0.5">{desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={enabled} className="sr-only peer" />
                        <div className="w-11 h-6 bg-cream-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl border border-cream-200 p-6">
                <h2 className="font-serif text-xl text-charcoal-900 font-bold mb-6">Security</h2>

                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 bg-cream-50 rounded-xl hover:bg-cream-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <Lock size={18} className="text-gold-600" />
                      <span className="font-sans text-sm font-semibold text-charcoal-900">Change Password</span>
                    </div>
                    <ChevronRight size={16} className="text-warm-400" />
                  </button>

                  <button className="w-full flex items-center justify-between p-4 bg-cream-50 rounded-xl hover:bg-cream-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <Shield size={18} className="text-gold-600" />
                      <span className="font-sans text-sm font-semibold text-charcoal-900">Two-Factor Authentication</span>
                    </div>
                    <span className="text-xs text-warm-400">{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
