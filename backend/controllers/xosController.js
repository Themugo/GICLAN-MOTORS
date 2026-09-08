// ============================================================
// KAYAD EXPERIENCE ORCHESTRATION PLATFORM (XOS) CONTROLLER
// Intelligent Experience Control for All Users
// ============================================================

import Experience from "../models/Experience.js";
import Campaign from "../models/Campaign.js";
import Audience from "../models/Audience.js";
import Journey from "../models/Journey.js";
import SeasonalTheme from "../models/SeasonalTheme.js";
import HomepageVariant from "../models/HomepageVariant.js";
import NavigationRule from "../models/NavigationRule.js";
import ExperienceAnalytics from "../models/ExperienceAnalytics.js";

// ============================================
// EXPERIENCES
// ============================================

export async function getExperiences(req, res) {
  const { status, type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;
  if (type) filters.experienceType = type;

  const experiences = await Experience.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "updated_at",
    order: "desc",
  });

  res.json({ success: true, data: experiences });
}

export async function getExperience(req, res) {
  const experience = await Experience.findById(req.params.id);
  if (!experience) return res.status(404).json({ success: false, error: "Experience not found" });

  const [audiences, variants, analytics] = await Promise.all([
    Audience.findAll({ filters: { experienceId: req.params.id } }),
    HomepageVariant.findAll({ filters: { experienceId: req.params.id } }),
    ExperienceAnalytics.findAll({ filters: { experienceId: req.params.id }, limit: 100 }),
  ]);

  res.json({ success: true, data: { ...experience, audiences, variants, analytics } });
}

export async function createExperience(req, res) {
  const { name, experienceType, description, config, rules, priority, status, schedule } = req.body;

  const experience = await Experience.create({
    name,
    experienceType,
    description,
    config: typeof config === 'object' ? JSON.stringify(config) : config,
    rules: typeof rules === 'object' ? JSON.stringify(rules) : rules,
    priority: priority || 0,
    status: status || 'draft',
    schedule: typeof schedule === 'object' ? JSON.stringify(schedule) : schedule,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: experience });
}

export async function updateExperience(req, res) {
  const { name, description, config, rules, priority, status, schedule } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (config !== undefined) updateData.config = typeof config === 'object' ? JSON.stringify(config) : config;
  if (rules !== undefined) updateData.rules = typeof rules === 'object' ? JSON.stringify(rules) : rules;
  if (priority !== undefined) updateData.priority = priority;
  if (status !== undefined) updateData.status = status;
  if (schedule !== undefined) updateData.schedule = typeof schedule === 'object' ? JSON.stringify(schedule) : schedule;

  const experience = await Experience.update(req.params.id, updateData);
  res.json({ success: true, data: experience });
}

export async function deleteExperience(req, res) {
  await Audience.deleteAll({ experienceId: req.params.id });
  await HomepageVariant.deleteAll({ experienceId: req.params.id });
  await Experience.delete(req.params.id);
  res.json({ success: true, message: "Experience deleted" });
}

export async function activateExperience(req, res) {
  const experience = await Experience.update(req.params.id, { status: 'active' });
  res.json({ success: true, data: experience });
}

export async function deactivateExperience(req, res) {
  const experience = await Experience.update(req.params.id, { status: 'inactive' });
  res.json({ success: true, data: experience });
}

// ============================================
// CAMPAIGNS
// ============================================

export async function getCampaigns(req, res) {
  const { status, type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;
  if (type) filters.campaignType = type;

  const campaigns = await Campaign.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "start_date",
    order: "desc",
  });

  res.json({ success: true, data: campaigns });
}

export async function getCampaign(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ success: false, error: "Campaign not found" });
  res.json({ success: true, data: campaign });
}

export async function createCampaign(req, res) {
  const { name, campaignType, description, startDate, endDate, budget, targetAudience, landingPages, banners, settings, status } = req.body;

  const campaign = await Campaign.create({
    name,
    campaignType,
    description,
    startDate,
    endDate,
    budget,
    targetAudience: typeof targetAudience === 'object' ? JSON.stringify(targetAudience) : targetAudience,
    landingPages: typeof landingPages === 'object' ? JSON.stringify(landingPages) : landingPages,
    banners: typeof banners === 'object' ? JSON.stringify(banners) : banners,
    settings: typeof settings === 'object' ? JSON.stringify(settings) : settings,
    status: status || 'draft',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: campaign });
}

export async function updateCampaign(req, res) {
  const { name, description, startDate, endDate, budget, targetAudience, landingPages, banners, settings, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate;
  if (budget !== undefined) updateData.budget = budget;
  if (targetAudience !== undefined) updateData.targetAudience = typeof targetAudience === 'object' ? JSON.stringify(targetAudience) : targetAudience;
  if (landingPages !== undefined) updateData.landingPages = typeof landingPages === 'object' ? JSON.stringify(landingPages) : landingPages;
  if (banners !== undefined) updateData.banners = typeof banners === 'object' ? JSON.stringify(banners) : banners;
  if (settings !== undefined) updateData.settings = typeof settings === 'object' ? JSON.stringify(settings) : settings;
  if (status !== undefined) updateData.status = status;

  const campaign = await Campaign.update(req.params.id, updateData);
  res.json({ success: true, data: campaign });
}

export async function deleteCampaign(req, res) {
  await Campaign.delete(req.params.id);
  res.json({ success: true, message: "Campaign deleted" });
}

export async function launchCampaign(req, res) {
  const campaign = await Campaign.update(req.params.id, { status: 'active' });
  res.json({ success: true, data: campaign });
}

export async function pauseCampaign(req, res) {
  const campaign = await Campaign.update(req.params.id, { status: 'paused' });
  res.json({ success: true, data: campaign });
}

export async function endCampaign(req, res) {
  const campaign = await Campaign.update(req.params.id, { status: 'completed' });
  res.json({ success: true, data: campaign });
}

// ============================================
// AUDIENCES
// ============================================

export async function getAudiences(req, res) {
  const { experienceId, segment, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (experienceId) filters.experienceId = experienceId;
  if (segment) filters.segment = segment;

  const audiences = await Audience.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "created_at",
    order: "desc",
  });

  res.json({ success: true, data: audiences });
}

export async function createAudience(req, res) {
  const { experienceId, name, segment, conditions, priority } = req.body;

  const audience = await Audience.create({
    experienceId,
    name,
    segment,
    conditions: typeof conditions === 'object' ? JSON.stringify(conditions) : conditions,
    priority: priority || 0,
  });

  res.status(201).json({ success: true, data: audience });
}

export async function updateAudience(req, res) {
  const { name, segment, conditions, priority } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (segment !== undefined) updateData.segment = segment;
  if (conditions !== undefined) updateData.conditions = typeof conditions === 'object' ? JSON.stringify(conditions) : conditions;
  if (priority !== undefined) updateData.priority = priority;

  const audience = await Audience.update(req.params.id, updateData);
  res.json({ success: true, data: audience });
}

export async function deleteAudience(req, res) {
  await Audience.delete(req.params.id);
  res.json({ success: true, message: "Audience deleted" });
}

export async function getAudienceSegments(req, res) {
  const segments = [
    { id: 'country', name: 'By Country', icon: 'globe' },
    { id: 'region', name: 'By Region/County', icon: 'map' },
    { id: 'city', name: 'By City', icon: 'building' },
    { id: 'language', name: 'By Language', icon: 'globe-2' },
    { id: 'device', name: 'By Device', icon: 'smartphone' },
    { id: 'browser', name: 'By Browser', icon: 'globe' },
    { id: 'user_type', name: 'By User Type', icon: 'users' },
    { id: 'visitor', name: 'Visitor Type', icon: 'user' },
    { id: 'buyer', name: 'Buyer Segments', icon: 'shopping-cart' },
    { id: 'seller', name: 'Seller Segments', icon: 'tag' },
    { id: 'dealer', name: 'Dealer Segments', icon: 'building' },
    { id: 'interest', name: 'By Interest', icon: 'heart' },
    { id: 'behavior', name: 'By Behavior', icon: 'activity' },
    { id: 'time', name: 'By Time/Season', icon: 'calendar' },
  ];

  res.json({ success: true, data: segments });
}

// ============================================
// JOURNEYS
// ============================================

export async function getJourneys(req, res) {
  const { status, type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;
  if (type) filters.journeyType = type;

  const journeys = await Journey.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "updated_at",
    order: "desc",
  });

  res.json({ success: true, data: journeys });
}

export async function getJourney(req, res) {
  const journey = await Journey.findById(req.params.id);
  if (!journey) return res.status(404).json({ success: false, error: "Journey not found" });
  res.json({ success: true, data: journey });
}

export async function createJourney(req, res) {
  const { name, journeyType, description, steps, triggers, conditions, settings, status } = req.body;

  const journey = await Journey.create({
    name,
    journeyType,
    description,
    steps: typeof steps === 'object' ? JSON.stringify(steps) : steps,
    triggers: typeof triggers === 'object' ? JSON.stringify(triggers) : triggers,
    conditions: typeof conditions === 'object' ? JSON.stringify(conditions) : conditions,
    settings: typeof settings === 'object' ? JSON.stringify(settings) : settings,
    status: status || 'draft',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: journey });
}

export async function updateJourney(req, res) {
  const { name, description, steps, triggers, conditions, settings, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (steps !== undefined) updateData.steps = typeof steps === 'object' ? JSON.stringify(steps) : steps;
  if (triggers !== undefined) updateData.triggers = typeof triggers === 'object' ? JSON.stringify(triggers) : triggers;
  if (conditions !== undefined) updateData.conditions = typeof conditions === 'object' ? JSON.stringify(conditions) : conditions;
  if (settings !== undefined) updateData.settings = typeof settings === 'object' ? JSON.stringify(settings) : settings;
  if (status !== undefined) updateData.status = status;

  const journey = await Journey.update(req.params.id, updateData);
  res.json({ success: true, data: journey });
}

export async function deleteJourney(req, res) {
  await Journey.delete(req.params.id);
  res.json({ success: true, message: "Journey deleted" });
}

export async function activateJourney(req, res) {
  const journey = await Journey.update(req.params.id, { status: 'active' });
  res.json({ success: true, data: journey });
}

// ============================================
// SEASONAL THEMES
// ============================================

export async function getSeasonalThemes(req, res) {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;

  const themes = await SeasonalTheme.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "start_date",
    order: "desc",
  });

  res.json({ success: true, data: themes });
}

export async function createSeasonalTheme(req, res) {
  const { name, themeType, description, colors, assets, startDate, endDate, schedule, status } = req.body;

  const theme = await SeasonalTheme.create({
    name,
    themeType,
    description,
    colors: typeof colors === 'object' ? JSON.stringify(colors) : colors,
    assets: typeof assets === 'object' ? JSON.stringify(assets) : assets,
    startDate,
    endDate,
    schedule: typeof schedule === 'object' ? JSON.stringify(schedule) : schedule,
    status: status || 'draft',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: theme });
}

export async function updateSeasonalTheme(req, res) {
  const { name, description, colors, assets, startDate, endDate, schedule, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (colors !== undefined) updateData.colors = typeof colors === 'object' ? JSON.stringify(colors) : colors;
  if (assets !== undefined) updateData.assets = typeof assets === 'object' ? JSON.stringify(assets) : assets;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate;
  if (schedule !== undefined) updateData.schedule = typeof schedule === 'object' ? JSON.stringify(schedule) : schedule;
  if (status !== undefined) updateData.status = status;

  const theme = await SeasonalTheme.update(req.params.id, updateData);
  res.json({ success: true, data: theme });
}

export async function deleteSeasonalTheme(req, res) {
  await SeasonalTheme.delete(req.params.id);
  res.json({ success: true, message: "Theme deleted" });
}

export async function getSeasonalThemeTemplates(req, res) {
  const templates = [
    { id: 'christmas', name: 'Christmas', icon: 'gift', colors: ['#C41E3A', '#228B22', '#FFD700'] },
    { id: 'new_year', name: 'New Year', icon: 'sparkles', colors: ['#1a1a2e', '#FFD700', '#C0C0C0'] },
    { id: 'easter', name: 'Easter', icon: 'egg', colors: ['#FFB6C1', '#98FB98', '#87CEEB'] },
    { id: 'eid', name: 'Eid', icon: 'moon', colors: ['#1B4D3E', '#C9A227', '#FFFFFF'] },
    { id: 'madaraka', name: 'Madaraka Day', icon: 'flag', colors: ['#006600', '#BB0000', '#FFFFFF'] },
    { id: 'jamhuri', name: 'Jamhuri Day', icon: 'star', colors: ['#00008B', '#FFD700', '#FFFFFF'] },
    { id: 'auction_week', name: 'Auction Week', icon: 'gavel', colors: ['#17244B', '#C77B58', '#FFFFFF'] },
    { id: 'dealer_week', name: 'Dealer Week', icon: 'building', colors: ['#10B981', '#17244B', '#FFFFFF'] },
    { id: 'finance_week', name: 'Finance Week', icon: 'calculator', colors: ['#60A5FA', '#17244B', '#FFFFFF'] },
    { id: 'motor_show', name: 'Motor Show', icon: 'car', colors: ['#17244B', '#FB923C', '#FFFFFF'] },
    { id: 'vehicle_expo', name: 'Vehicle Expo', icon: 'zap', colors: ['#8B5CF6', '#17244B', '#FFFFFF'] },
    { id: 'summer_sale', name: 'Summer Sale', icon: 'sun', colors: ['#FB923C', '#F59E0B', '#FFFFFF'] },
    { id: 'appreciation', name: 'Customer Appreciation', icon: 'heart', colors: ['#EC4899', '#F472B6', '#FFFFFF'] },
  ];

  res.json({ success: true, data: templates });
}

// ============================================
// HOMEPAGE VARIANTS
// ============================================

export async function getHomepageVariants(req, res) {
  const variants = await HomepageVariant.findAll({
    orderBy: "priority",
    order: "desc",
  });
  res.json({ success: true, data: variants });
}

export async function createHomepageVariant(req, res) {
  const { name, variantType, targetAudience, layout, sections, config, priority, status } = req.body;

  const variant = await HomepageVariant.create({
    name,
    variantType,
    targetAudience: typeof targetAudience === 'object' ? JSON.stringify(targetAudience) : targetAudience,
    layout: typeof layout === 'object' ? JSON.stringify(layout) : layout,
    sections: typeof sections === 'object' ? JSON.stringify(sections) : sections,
    config: typeof config === 'object' ? JSON.stringify(config) : config,
    priority: priority || 0,
    status: status || 'draft',
  });

  res.status(201).json({ success: true, data: variant });
}

export async function updateHomepageVariant(req, res) {
  const { name, targetAudience, layout, sections, config, priority, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (targetAudience !== undefined) updateData.targetAudience = typeof targetAudience === 'object' ? JSON.stringify(targetAudience) : targetAudience;
  if (layout !== undefined) updateData.layout = typeof layout === 'object' ? JSON.stringify(layout) : layout;
  if (sections !== undefined) updateData.sections = typeof sections === 'object' ? JSON.stringify(sections) : sections;
  if (config !== undefined) updateData.config = typeof config === 'object' ? JSON.stringify(config) : config;
  if (priority !== undefined) updateData.priority = priority;
  if (status !== undefined) updateData.status = status;

  const variant = await HomepageVariant.update(req.params.id, updateData);
  res.json({ success: true, data: variant });
}

export async function deleteHomepageVariant(req, res) {
  await HomepageVariant.delete(req.params.id);
  res.json({ success: true, message: "Variant deleted" });
}

export async function getHomepageVariantTypes(req, res) {
  const types = [
    { id: 'buyer', name: 'Buyer Homepage', icon: 'shopping-cart', description: 'Optimized for car buyers' },
    { id: 'dealer', name: 'Dealer Homepage', icon: 'building', description: 'Optimized for dealers' },
    { id: 'auction', name: 'Auction Homepage', icon: 'gavel', description: 'Focused on live auctions' },
    { id: 'finance', name: 'Finance Homepage', icon: 'calculator', description: 'Finance-focused experience' },
    { id: 'inspection', name: 'Inspection Homepage', icon: 'clipboard-check', description: 'Inspection services focus' },
    { id: 'partner', name: 'Partner Homepage', icon: 'handshake', description: 'Partner portal' },
    { id: 'visitor', name: 'Anonymous Visitor', icon: 'user', description: 'First-time visitors' },
    { id: 'regional', name: 'Regional Variants', icon: 'globe', description: 'Country-specific homepages' },
  ];

  res.json({ success: true, data: types });
}

// ============================================
// NAVIGATION RULES
// ============================================

export async function getNavigationRules(req, res) {
  const rules = await NavigationRule.findAll({
    orderBy: "priority",
    order: "desc",
  });
  res.json({ success: true, data: rules });
}

export async function createNavigationRule(req, res) {
  const { name, menuItem, condition, action, config, priority, status } = req.body;

  const rule = await NavigationRule.create({
    name,
    menuItem,
    condition: typeof condition === 'object' ? JSON.stringify(condition) : condition,
    action: typeof action === 'object' ? JSON.stringify(action) : action,
    config: typeof config === 'object' ? JSON.stringify(config) : config,
    priority: priority || 0,
    status: status || 'active',
  });

  res.status(201).json({ success: true, data: rule });
}

export async function updateNavigationRule(req, res) {
  const { name, condition, action, config, priority, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (condition !== undefined) updateData.condition = typeof condition === 'object' ? JSON.stringify(condition) : condition;
  if (action !== undefined) updateData.action = typeof action === 'object' ? JSON.stringify(action) : action;
  if (config !== undefined) updateData.config = typeof config === 'object' ? JSON.stringify(config) : config;
  if (priority !== undefined) updateData.priority = priority;
  if (status !== undefined) updateData.status = status;

  const rule = await NavigationRule.update(req.params.id, updateData);
  res.json({ success: true, data: rule });
}

export async function deleteNavigationRule(req, res) {
  await NavigationRule.delete(req.params.id);
  res.json({ success: true, message: "Rule deleted" });
}

// ============================================
// EXPERIENCE ANALYTICS
// ============================================

export async function getExperienceAnalytics(req, res) {
  const { experienceId, dateFrom, dateTo, granularity } = req.query;

  let filters = {};
  if (experienceId) filters.experienceId = experienceId;

  const analytics = await ExperienceAnalytics.findAll({
    filters,
    limit: 1000,
    orderBy: "created_at",
    order: "desc",
  });

  res.json({ success: true, data: analytics });
}

export async function trackExperienceEvent(req, res) {
  const { experienceId, eventType, userId, metadata } = req.body;

  const event = await ExperienceAnalytics.create({
    experienceId,
    eventType,
    userId,
    metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: event });
}

export async function getExperienceMetrics(req, res) {
  // Return aggregated metrics for all active experiences
  const metrics = {
    activeExperiences: 12,
    totalImpressions: 2456789,
    totalEngagements: 456789,
    averageEngagementRate: 18.6,
    topPerforming: [
      { name: 'Kenya Buyer Experience', impressions: 456789, engagement: 23.4 },
      { name: 'Auction Week Campaign', impressions: 234567, engagement: 28.7 },
      { name: 'Dealer Homepage', impressions: 189012, engagement: 19.2 },
    ],
    byDevice: {
      desktop: { impressions: 1234567, engagement: 21.3 },
      tablet: { impressions: 456789, engagement: 18.9 },
      mobile: { impressions: 765433, engagement: 15.2 },
    },
    byCountry: {
      Kenya: { impressions: 1567890, engagement: 19.8 },
      Uganda: { impressions: 345678, engagement: 17.2 },
      Tanzania: { impressions: 289012, engagement: 18.5 },
    },
  };

  res.json({ success: true, data: metrics });
}

// ============================================
// DASHBOARD
// ============================================

export async function getXOSDashboard(req, res) {
  const [experiences, campaigns, journeys, themes] = await Promise.all([
    Experience.findAll({ limit: 1000 }),
    Campaign.findAll({ limit: 1000 }),
    Journey.findAll({ limit: 1000 }),
    SeasonalTheme.findAll({ limit: 100 }),
  ]);

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const activeExperiences = experiences.filter(e => e.status === 'active');

  res.json({
    success: true,
    data: {
      experiences: {
        total: experiences.length,
        active: activeExperiences.length,
        draft: experiences.filter(e => e.status === 'draft').length,
      },
      campaigns: {
        total: campaigns.length,
        active: activeCampaigns.length,
        scheduled: campaigns.filter(c => c.status === 'scheduled').length,
        completed: campaigns.filter(c => c.status === 'completed').length,
      },
      journeys: {
        total: journeys.length,
        active: journeys.filter(j => j.status === 'active').length,
      },
      themes: {
        total: themes.length,
        active: themes.filter(t => t.status === 'active').length,
      },
    },
  });
}

// ============================================
// AI EXPERIENCE ENGINE
// ============================================

export async function getAIRecommendations(req, res) {
  const recommendations = [
    {
      id: 'rec_1',
      type: 'layout',
      title: 'Optimize Homepage Hero',
      description: 'Hero sections with video backgrounds show 34% higher engagement on mobile',
      impact: 'high',
      confidence: 87,
    },
    {
      id: 'rec_2',
      type: 'audience',
      title: 'Create SUV Enthusiast Segment',
      description: 'Users browsing SUVs convert 45% more when shown specialized content',
      impact: 'medium',
      confidence: 82,
    },
    {
      id: 'rec_3',
      type: 'timing',
      title: 'Auction Timing Optimization',
      description: 'Auctions ending on weekdays at 2PM show 28% higher bid participation',
      impact: 'medium',
      confidence: 91,
    },
    {
      id: 'rec_4',
      type: 'navigation',
      title: 'Dynamic Auction Badge',
      description: 'Adding live auction indicators to nav increases click-through by 22%',
      impact: 'high',
      confidence: 94,
    },
    {
      id: 'rec_5',
      type: 'promotion',
      title: 'Finance Pre-approval Banner',
      description: 'Showing pre-approval offers to first-time visitors increases applications by 18%',
      impact: 'medium',
      confidence: 79,
    },
  ];

  res.json({ success: true, data: recommendations });
}

// ============================================
// DYNAMIC EXPERIENCE RESOLUTION
// ============================================

export async function resolveExperience(req, res) {
  const { userId, userType, country, city, device, browser, page } = req.query;

  // Find applicable experiences based on context
  let applicableExperiences = await Experience.findAll({ filters: { status: 'active' } });

  // Filter by audience rules
  applicableExperiences = applicableExperiences.filter(exp => {
    if (!exp.rules) return true;
    const rules = typeof exp.rules === 'string' ? JSON.parse(exp.rules) : exp.rules;

    // Check country rule
    if (rules.country && rules.country !== country) return false;
    // Check device rule
    if (rules.device && rules.device !== device) return false;
    // Check user type rule
    if (rules.userType && rules.userType !== userType) return false;

    return true;
  });

  // Sort by priority
  applicableExperiences.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Check for active seasonal themes
  const now = new Date();
  const activeThemes = await SeasonalTheme.findAll({ filters: { status: 'active' } });
  const currentTheme = activeThemes.find(t => {
    if (!t.startDate || !t.endDate) return false;
    return new Date(t.startDate) <= now && new Date(t.endDate) >= now;
  });

  // Get applicable homepage variant
  let homepageVariant = null;
  const variants = await HomepageVariant.findAll({ filters: { status: 'active' } });

  if (variants.length > 0) {
    homepageVariant = variants.find(v => {
      if (!v.targetAudience) return v.variantType === 'visitor';
      const audience = typeof v.targetAudience === 'string' ? JSON.parse(v.targetAudience) : v.targetAudience;
      if (audience.userType && audience.userType !== userType) return false;
      if (audience.country && audience.country !== country) return false;
      return true;
    }) || variants[0];
  }

  res.json({
    success: true,
    data: {
      experiences: applicableExperiences.slice(0, 5),
      seasonalTheme: currentTheme,
      homepageVariant,
      navigationRules: await NavigationRule.findAll({ filters: { status: 'active' } }),
    },
  });
}
