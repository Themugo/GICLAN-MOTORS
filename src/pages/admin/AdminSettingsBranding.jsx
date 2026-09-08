import { useState } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';

// Color field component with color picker and hex input
const ColorField = ({ label, value, onChange, description }) => (
  <div className="input-group">
    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: value,
        border: '2px solid var(--border)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <input type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%',
            height: '100%'
          }}
        />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{description}</div>}
      </div>
    </label>
    <input className="input" type="text" value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ height: 38, fontFamily: 'monospace', fontSize: 13, marginTop: 6 }}
      placeholder="#000000"
    />
  </div>
);

// Section card wrapper
const SectionCard = ({ title, icon, children }) => (
  <div className="card" style={{ padding: 24 }}>
    <h3 style={{ fontSize: '1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon && <span style={{ fontSize: '1.2rem' }}>{icon}</span>}
      {title}
    </h3>
    {children}
  </div>
);

// Logo type selector with visual feedback
const LogoTypeButton = ({ id, label, isSelected, onClick }) => (
  <button
    onClick={() => onClick(id)}
    style={{
      padding: '10px 20px',
      borderRadius: 10,
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 700,
      transition: 'all 0.2s ease',
      background: isSelected ? 'var(--brand)' : 'rgba(22, 196, 164, 0.08)',
      border: `2px solid ${isSelected ? 'var(--brand)' : 'var(--border)'}`,
      color: isSelected ? '#fff' : 'var(--text-secondary)',
    }}
  >
    {label}
  </button>
);

// Live preview component
const BrandingPreview = ({ branding }) => (
  <div style={{
    background: branding.backgroundColor,
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    border: '1px solid var(--border)',
  }}>
    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      Live Preview
    </div>

    {/* Navbar preview */}
    <div style={{
      background: '#0A1626',
      borderRadius: 8,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: branding.primaryColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
        }}>
          {branding.logoText?.charAt(0) || 'K'}
        </div>
        <span style={{ color: '#FDFAF5', fontWeight: 600, fontSize: 15 }}>{branding.logoText || 'KAYAD'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {['Home', 'Auctions', 'About'].map(item => (
          <span key={item} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{item}</span>
        ))}
      </div>
    </div>

    {/* Button preview */}
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      <button style={{
        padding: '10px 20px',
        borderRadius: 8,
        background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.primaryDark})`,
        color: '#fff',
        fontWeight: 600,
        fontSize: 13,
        border: 'none',
        cursor: 'pointer',
      }}>
        Primary Button
      </button>
      <button style={{
        padding: '10px 20px',
        borderRadius: 8,
        background: 'transparent',
        color: branding.primaryColor,
        fontWeight: 600,
        fontSize: 13,
        border: `2px solid ${branding.primaryColor}`,
        cursor: 'pointer',
      }}>
        Outline Button
      </button>
    </div>

    {/* Badge preview */}
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{
        padding: '4px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: `${branding.successColor}20`,
        color: branding.successColor,
      }}>
        Success
      </span>
      <span style={{
        padding: '4px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: `${branding.primaryColor}20`,
        color: branding.primaryColor,
      }}>
        Brand
      </span>
    </div>
  </div>
);

export default function AdminSettingsBranding({ branding, setBranding, config, setConfig, saveConfig, saving }) {
  const { toast } = useToast();

  // Handle color change with validation
  const handleColorChange = (key, value) => {
    // Validate hex color format
    if (value.match(/^#[0-9A-Fa-f]{0,8}$/)) {
      setBranding(p => ({...p, [key]: value}));
    }
  };

  // Auto-generate color variants from primary color
  const autoGenerateVariants = () => {
    const primary = branding.primaryColor;
    // Simple lightening/darkening logic
    const lightVariant = primary + '80'; // Add transparency
    const darkVariant = '#0C7B68'; // Default dark variant
    const glowVariant = primary + '40'; // Glow effect

    setBranding(p => ({
      ...p,
      primaryLight: lightVariant,
      primaryDark: darkVariant,
      primaryGlow: glowVariant,
    }));
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Logo & Identity Section */}
      <SectionCard title="Logo & Identity" icon="🎨">
        <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
          {/* Logo Type Selection */}
          <div>
            <label className="input-label">Logo Type</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <LogoTypeButton
                id="icon"
                label="Letter Icon"
                isSelected={branding.logoType === 'icon'}
                onClick={(id) => setBranding(p => ({...p, logoType: id}))}
              />
              <LogoTypeButton
                id="text"
                label="Text Logo"
                isSelected={branding.logoType === 'text'}
                onClick={(id) => setBranding(p => ({...p, logoType: id}))}
              />
              <LogoTypeButton
                id="image"
                label="Image Upload"
                isSelected={branding.logoType === 'image'}
                onClick={(id) => setBranding(p => ({...p, logoType: id}))}
              />
            </div>
          </div>

          {/* Logo Preview/Upload */}
          {branding.logoType === 'image' ? (
            <div>
              <label className="input-label">Logo Image</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                {branding.logoUrl && (
                  <img src={branding.logoUrl} alt="Logo preview" decoding="async"
                    style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--border)' }} />
                )}
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('logo', file);
                  try {
                    const res = await adminAPI.uploadLogo(form);
                    if (res?.url) setBranding(p => ({...p, logoUrl: res.url}));
                    toast('Logo uploaded successfully', 'success');
                  } catch { toast('Upload failed', 'error'); }
                }} style={{ fontSize: 13, color: 'var(--text-muted)' }} />
              </div>
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Logo Text</label>
              <input className="input" type="text" value={branding.logoText}
                onChange={e => setBranding(p => ({...p, logoText: e.target.value}))}
                placeholder="K" style={{ height: 44 }} />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Brand Tagline</label>
            <input className="input" type="text" value={branding.brandTagline}
              onChange={e => setBranding(p => ({...p, brandTagline: e.target.value}))}
              placeholder="Premium Automotive Marketplace" style={{ height: 44 }} />
          </div>
        </div>
      </SectionCard>

      {/* Primary Colors Section */}
      <SectionCard title="Primary Brand Colors" icon="🌿">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
          <ColorField
            label="Primary Color"
            value={branding.primaryColor}
            onChange={(val) => setBranding(p => ({...p, primaryColor: val}))}
            description="Main brand color (green)"
          />
          <ColorField
            label="Primary Light"
            value={branding.primaryLight}
            onChange={(val) => setBranding(p => ({...p, primaryLight: val}))}
            description="Lighter variant"
          />
          <ColorField
            label="Primary Dark"
            value={branding.primaryDark}
            onChange={(val) => setBranding(p => ({...p, primaryDark: val}))}
            description="Darker variant"
          />
          <ColorField
            label="Primary Glow"
            value={branding.primaryGlow}
            onChange={(val) => setBranding(p => ({...p, primaryGlow: val}))}
            description="Glow/shadow effect"
          />
        </div>
        <button
          onClick={autoGenerateVariants}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            background: 'var(--gold-100, rgba(22, 196, 164, 0.1))',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--brand)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔄 Auto-generate Variants
        </button>
      </SectionCard>

      {/* Background Colors Section */}
      <SectionCard title="Background & Surface Colors" icon="🎭">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
          <ColorField
            label="Background"
            value={branding.backgroundColor}
            onChange={(val) => setBranding(p => ({...p, backgroundColor: val}))}
            description="Main page background"
          />
          <ColorField
            label="Surface"
            value={branding.surfaceColor}
            onChange={(val) => setBranding(p => ({...p, surfaceColor: val}))}
            description="Cards and panels"
          />
          <ColorField
            label="Card"
            value={branding.cardColor}
            onChange={(val) => setBranding(p => ({...p, cardColor: val}))}
            description="Elevated surfaces"
          />
          <ColorField
            label="Accent"
            value={branding.accentColor}
            onChange={(val) => setBranding(p => ({...p, accentColor: val}))}
            description="Secondary accent"
          />
        </div>
      </SectionCard>

      {/* Text Colors Section */}
      <SectionCard title="Text Colors" icon="✏️">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
          <ColorField
            label="Primary Text"
            value={branding.textColor}
            onChange={(val) => setBranding(p => ({...p, textColor: val}))}
            description="Main body text"
          />
          <ColorField
            label="Muted Text"
            value={branding.textMutedColor}
            onChange={(val) => setBranding(p => ({...p, textMutedColor: val}))}
            description="Secondary text"
          />
          <ColorField
            label="Dim Text"
            value={branding.textDimColor}
            onChange={(val) => setBranding(p => ({...p, textDimColor: val}))}
            description="Placeholder text"
          />
          <ColorField
            label="Border"
            value={branding.borderColor}
            onChange={(val) => setBranding(p => ({...p, borderColor: val}))}
            description="Borders and dividers"
          />
        </div>
      </SectionCard>

      {/* Status Colors Section */}
      <SectionCard title="Status & Semantic Colors" icon="📊">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 600 }}>
          <ColorField
            label="Success"
            value={branding.successColor}
            onChange={(val) => setBranding(p => ({...p, successColor: val}))}
            description="Success states"
          />
          <ColorField
            label="Danger"
            value={branding.dangerColor}
            onChange={(val) => setBranding(p => ({...p, dangerColor: val}))}
            description="Error states"
          />
          <ColorField
            label="Warning"
            value={branding.warningColor}
            onChange={(val) => setBranding(p => ({...p, warningColor: val}))}
            description="Warning states"
          />
          <ColorField
            label="Info"
            value={branding.infoColor}
            onChange={(val) => setBranding(p => ({...p, infoColor: val}))}
            description="Information states"
          />
        </div>
      </SectionCard>

      {/* Live Preview */}
      <BrandingPreview branding={branding} />

      {/* Save Button */}
      <button
        className="btn"
        onClick={() => saveConfig('branding')}
        disabled={saving}
        style={{
          width: '100%',
          padding: '14px 24px',
          background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.primaryDark})`,
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          border: 'none',
          borderRadius: 12,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {saving ? (
          <>
            <div className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
            Saving...
          </>
        ) : (
          <>💾 Save Branding Settings</>
        )}
      </button>
    </div>
  );
}
