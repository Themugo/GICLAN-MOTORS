import AdSlot from '../models/AdSlot.js';

const VALID_PLACEMENTS = ['top_ticker', 'left_rail', 'right_rail', 'mid_grid', 'sidebar'];
const ACTIVE_STATUSES = ['active'];

function isCurrentlyActive(ad) {
  if (!ad?.isVisible) return false;
  if (ad.status && !ACTIVE_STATUSES.includes(ad.status)) return false;
  const now = Date.now();
  if (ad.startAt && new Date(ad.startAt).getTime() > now) return false;
  if (ad.endAt && new Date(ad.endAt).getTime() <= now) return false;
  return true;
}

function normalizeInput(input = {}) {
  const output = { ...input };
  if (output.placement !== undefined && !VALID_PLACEMENTS.includes(output.placement)) throw new Error('Invalid placement');
  if (output.title !== undefined) {
    output.title = String(output.title).trim();
    if (!output.title) throw new Error('Title is required');
  }
  if (output.buttonUrl !== undefined && output.buttonUrl) {
    const url = String(output.buttonUrl).trim();
    if (!/^https?:\/\//i.test(url)) throw new Error('buttonUrl must use http or https');
    output.buttonUrl = url;
  }
  if (output.opacity !== undefined) {
    output.opacity = Number(output.opacity);
    if (!Number.isFinite(output.opacity) || output.opacity < 0 || output.opacity > 100) throw new Error('Opacity must be between 0 and 100');
  }
  if (output.sortOrder !== undefined) {
    output.sortOrder = Number(output.sortOrder);
    if (!Number.isInteger(output.sortOrder)) throw new Error('sortOrder must be an integer');
  }
  return output;
}

export const advertisingService = {
  placements: VALID_PLACEMENTS,

  async listPublic(placement) {
    if (placement && !VALID_PLACEMENTS.includes(placement)) throw new Error('Invalid placement');
    const filters = { isVisible: true, status: 'active' };
    if (placement) filters.placement = placement;
    const rows = await AdSlot.find(filters).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return rows.filter(isCurrentlyActive);
  },

  async listAdmin() {
    return AdSlot.find({}).sort({ placement: 1, sortOrder: 1, createdAt: -1 }).lean();
  },

  async create(input, actorId) {
    const data = normalizeInput(input);
    return AdSlot.create({
      ...data,
      status: data.status || 'active',
      isVisible: data.isVisible !== false,
      backgroundColor: data.backgroundColor || '#1E3063',
      textColor: data.textColor || '#FFFFFF',
      opacity: data.opacity ?? 100,
      sortOrder: data.sortOrder ?? 0,
      impressions: 0,
      clicks: 0,
      createdBy: actorId,
    });
  },

  async update(id, input) {
    return AdSlot.findByIdAndUpdate(id, normalizeInput(input), { new: true });
  },

  async remove(id) {
    return AdSlot.findByIdAndDelete(id);
  },

  async recordEvent(id, type) {
    if (!['impression', 'click'].includes(type)) throw new Error('Invalid advertising event');
    const ad = await AdSlot.findById(id);
    if (!ad || !isCurrentlyActive(ad)) return null;
    const field = type === 'impression' ? 'impressions' : 'clicks';
    const current = Number(ad[field] || 0);
    return AdSlot.findByIdAndUpdate(id, { [field]: current + 1 }, { new: true });
  },

  async stats() {
    const rows = await AdSlot.find({}).lean();
    return rows.map((ad) => {
      const impressions = Number(ad.impressions || 0);
      const clicks = Number(ad.clicks || 0);
      return { id: ad.id, title: ad.title, placement: ad.placement, status: ad.status || 'active', isVisible: !!ad.isVisible, impressions, clicks, ctr: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0 };
    });
  },
};
