// ============================================================
// KAYAD ENTERPRISE CONTENT STUDIO
// DIGITAL PUBLISHING PLATFORM SERVICE
// ============================================================

import db from '../../db/index.js';
import { logInfo, logError } from '../../utils/logger.js';

/**
 * Content Studio Service
 * Complete digital publishing platform for KAYAD
 */
class ContentStudioService {

  // ============================================================
  // ARTICLES (BLOGS / NEWS)
  // ============================================================

  /**
   * Create article
   */
  async createArticle(articleData, userId, userName) {
    const articleCode = `ART-${Date.now().toString(36).toUpperCase()}`;
    const slug = this.generateSlug(articleData.title);

    // Calculate reading time
    const wordCount = articleData.content?.split(/\s+/).length || 0;
    const readingTime = Math.ceil(wordCount / 200);

    const article = await db.create('cs_articles', {
      article_code: articleCode,
      title: articleData.title,
      slug: slug,
      excerpt: articleData.excerpt,
      content: articleData.content,
      content_type: articleData.contentType || 'blog',
      author_id: userId,
      author_name: userName,
      categories: articleData.categories || [],
      tags: articleData.tags || [],
      featured_image: articleData.featuredImage,
      meta_title: articleData.metaTitle,
      meta_description: articleData.metaDescription,
      reading_time_minutes: readingTime,
      word_count: wordCount,
      status: 'draft',
      created_by: userId,
      created_by_name: userName,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Log workflow
    await this.logWorkflow(article.id, 'article', 'created', userId, userName, 'Creator', null, 'draft');

    return article;
  }

  /**
   * Update article
   */
  async updateArticle(articleId, articleData, userId, userName) {
    const article = await db.findById('cs_articles', articleId);
    if (!article) throw new Error('Article not found');

    // Recalculate reading time if content changed
    let readingTime = article.reading_time_minutes;
    let wordCount = article.word_count;
    if (articleData.content) {
      wordCount = articleData.content.split(/\s+/).length;
      readingTime = Math.ceil(wordCount / 200);
    }

    await db.update('cs_articles', articleId, {
      ...articleData,
      reading_time_minutes: readingTime,
      word_count: wordCount,
      updated_at: new Date(),
    });

    return db.findById('cs_articles', articleId);
  }

  /**
   * Submit for review
   */
  async submitForReview(articleId, userId, userName) {
    await db.update('cs_articles', articleId, {
      status: 'review',
      updated_at: new Date(),
    });

    await this.logWorkflow(articleId, 'article', 'submitted', userId, userName, 'Creator');
    return this.getArticle(articleId);
  }

  /**
   * Approve article
   */
  async approveArticle(articleId, userId, userName, comment) {
    await db.update('cs_articles', articleId, {
      status: 'approved',
      reviewed_by: userId,
      reviewed_by_name: userName,
      updated_at: new Date(),
    });

    await this.logWorkflow(articleId, 'article', 'approved', userId, userName, 'Reviewer', 'review', 'approved', comment);
    return this.getArticle(articleId);
  }

  /**
   * Publish article
   */
  async publishArticle(articleId, userId, userName) {
    const article = await db.findById('cs_articles', articleId);

    // Create version before publishing
    await this.createVersion('article', articleId, article, `Published: ${article.title}`, userId, userName);

    await db.update('cs_articles', articleId, {
      status: 'published',
      published_at: new Date(),
      approved_by: userId,
      approved_by_name: userName,
      version: (article.version || 1) + 1,
      updated_at: new Date(),
    });

    await this.logWorkflow(articleId, 'article', 'published', userId, userName, 'Publisher');

    return this.getArticle(articleId);
  }

  /**
   * Schedule article
   */
  async scheduleArticle(articleId, publishAt, userId, userName) {
    await db.update('cs_articles', articleId, {
      status: 'scheduled',
      schedule_publish_at: new Date(publishAt),
      updated_at: new Date(),
    });

    // Add to publishing schedule
    await this.addToSchedule('article', articleId, 'publish', new Date(publishAt), userId);

    return this.getArticle(articleId);
  }

  /**
   * Get article by ID
   */
  async getArticle(articleId) {
    return db.findById('cs_articles', articleId);
  }

  /**
   * Get articles
   */
  async getArticles(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.contentType) query.content_type = filters.contentType;
    if (filters.authorId) query.author_id = filters.authorId;

    return db.find('cs_articles', query, { sort: { created_at: -1 } });
  }

  /**
   * Get featured articles
   */
  async getFeaturedArticles(limit = 5) {
    return db.find('cs_articles', {
      status: 'published',
      is_featured: true
    }, { sort: { published_at: -1 }, limit });
  }

  /**
   * Get articles by category
   */
  async getArticlesByCategory(category, limit = 10) {
    const articles = await db.find('cs_articles', { status: 'published' });
    return articles
      .filter(a => a.categories?.includes(category))
      .slice(0, limit);
  }

  // ============================================================
  // FAQ MANAGEMENT
  // ============================================================

  /**
   * Create FAQ
   */
  async createFAQ(faqData) {
    const faqCode = `FAQ-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cs_faqs', {
      faq_code: faqCode,
      question: faqData.question,
      answer: faqData.answer,
      category: faqData.category,
      subcategory: faqData.subcategory,
      tags: faqData.tags || [],
      status: 'draft',
      ordering: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Update FAQ
   */
  async updateFAQ(faqId, faqData) {
    await db.update('cs_faqs', faqId, {
      ...faqData,
      updated_at: new Date(),
    });
    return db.findById('cs_faqs', faqId);
  }

  /**
   * Publish FAQ
   */
  async publishFAQ(faqId) {
    await db.update('cs_faqs', faqId, {
      status: 'published',
      published_at: new Date(),
    });
  }

  /**
   * Get FAQs
   */
  async getFAQs(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;

    const faqs = await db.find('cs_faqs', query, { sort: { ordering: 1 } });

    if (filters.category) {
      return faqs.filter(f => f.category === filters.category);
    }

    return faqs;
  }

  /**
   * Get FAQ categories with counts
   */
  async getFAQCategories() {
    const faqs = await db.find('cs_faqs', { status: 'published' });
    const categories = {};

    faqs.forEach(faq => {
      const cat = faq.category || 'General';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return Object.entries(categories).map(([name, count]) => ({ name, count }));
  }

  /**
   * Search FAQs
   */
  async searchFAQs(query) {
    const faqs = await db.find('cs_faqs', { status: 'published' });
    const q = query.toLowerCase();

    return faqs.filter(faq =>
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  /**
   * Record FAQ feedback
   */
  async recordFAQFeedback(faqId, isHelpful) {
    const faq = await db.findById('cs_faqs', faqId);
    if (isHelpful) {
      await db.update('cs_faqs', faqId, { helpful_count: (faq.helpful_count || 0) + 1 });
    } else {
      await db.update('cs_faqs', faqId, { not_helpful_count: (faq.not_helpful_count || 0) + 1 });
    }
  }

  // ============================================================
  // LANDING PAGES
  // ============================================================

  /**
   * Create landing page
   */
  async createLandingPage(pageData, userId, userName) {
    const pageCode = `LP-${Date.now().toString(36).toUpperCase()}`;
    const slug = this.generateSlug(pageData.pageName);

    return db.create('cs_landing_pages', {
      page_code: pageCode,
      page_name: pageData.pageName,
      slug: slug,
      purpose: pageData.purpose,
      hero_title: pageData.heroTitle,
      hero_subtitle: pageData.heroSubtitle,
      hero_image: pageData.heroImage,
      blocks: pageData.blocks || [],
      meta_title: pageData.metaTitle,
      meta_description: pageData.metaDescription,
      primary_cta_text: pageData.primaryCtaText,
      primary_cta_url: pageData.primaryCtaUrl,
      secondary_cta_text: pageData.secondaryCtaText,
      secondary_cta_url: pageData.secondaryCtaUrl,
      target_countries: pageData.targetCountries || [],
      target_user_types: pageData.targetUserTypes || [],
      status: 'draft',
      created_by: userId,
      created_by_name: userName,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Update landing page
   */
  async updateLandingPage(pageId, pageData) {
    await db.update('cs_landing_pages', pageId, {
      ...pageData,
      updated_at: new Date(),
    });
    return db.findById('cs_landing_pages', pageId);
  }

  /**
   * Publish landing page
   */
  async publishLandingPage(pageId) {
    await db.update('cs_landing_pages', pageId, {
      status: 'published',
      published_at: new Date(),
      updated_at: new Date(),
    });
    return db.findById('cs_landing_pages', pageId);
  }

  /**
   * Get landing pages
   */
  async getLandingPages(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.purpose) query.purpose = filters.purpose;

    return db.find('cs_landing_pages', query, { sort: { created_at: -1 } });
  }

  // ============================================================
  // CAMPAIGNS
  // ============================================================

  /**
   * Create campaign
   */
  async createCampaign(campaignData) {
    const campaignCode = `CAMP-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cs_campaigns', {
      campaign_code: campaignCode,
      campaign_name: campaignData.campaignName,
      description: campaignData.description,
      campaign_type: campaignData.campaignType,
      headline: campaignData.headline,
      description_text: campaignData.descriptionText,
      banner_image: campaignData.bannerImage,
      discount_type: campaignData.discountType,
      discount_value: campaignData.discountValue,
      max_discount: campaignData.maxDiscount,
      terms_conditions: campaignData.termsConditions,
      target_vehicle_types: campaignData.targetVehicleTypes || [],
      target_dealers: campaignData.targetDealers || [],
      target_countries: campaignData.targetCountries || [],
      start_date: campaignData.startDate,
      end_date: campaignData.endDate,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId, campaignData) {
    await db.update('cs_campaigns', campaignId, {
      ...campaignData,
      updated_at: new Date(),
    });
    return db.findById('cs_campaigns', campaignId);
  }

  /**
   * Activate campaign
   */
  async activateCampaign(campaignId) {
    await db.update('cs_campaigns', campaignId, {
      status: 'active',
      updated_at: new Date(),
    });
  }

  /**
   * Get campaigns
   */
  async getCampaigns(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.campaignType) query.campaign_type = filters.campaignType;

    return db.find('cs_campaigns', query, { sort: { created_at: -1 } });
  }

  /**
   * Track campaign impression
   */
  async trackCampaignImpression(campaignId) {
    const campaign = await db.findById('cs_campaigns', campaignId);
    if (campaign) {
      await db.update('cs_campaigns', campaignId, {
        impressions: (campaign.impressions || 0) + 1,
      });
    }
  }

  /**
   * Track campaign conversion
   */
  async trackCampaignConversion(campaignId, revenue = 0) {
    const campaign = await db.findById('cs_campaigns', campaignId);
    if (campaign) {
      await db.update('cs_campaigns', campaignId, {
        conversions: (campaign.conversions || 0) + 1,
        revenue_generated: (campaign.revenue_generated || 0) + revenue,
      });
    }
  }

  // ============================================================
  // BANNERS
  // ============================================================

  /**
   * Create banner
   */
  async createBanner(bannerData) {
    const bannerCode = `BNR-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cs_banners', {
      banner_code: bannerCode,
      banner_name: bannerData.bannerName,
      banner_type: bannerData.bannerType,
      title: bannerData.title,
      subtitle: bannerData.subtitle,
      content: bannerData.content,
      cta_text: bannerData.ctaText,
      cta_url: bannerData.ctaUrl,
      desktop_image: bannerData.desktopImage,
      tablet_image: bannerData.tabletImage,
      mobile_image: bannerData.mobileImage,
      background_color: bannerData.backgroundColor,
      text_color: bannerData.textColor,
      target_pages: bannerData.targetPages || [],
      target_countries: bannerData.targetCountries || [],
      target_user_types: bannerData.targetUserTypes || [],
      position: bannerData.position,
      size: bannerData.size || 'medium',
      start_date: bannerData.startDate,
      end_date: bannerData.endDate,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Update banner
   */
  async updateBanner(bannerId, bannerData) {
    await db.update('cs_banners', bannerId, {
      ...bannerData,
      updated_at: new Date(),
    });
    return db.findById('cs_banners', bannerId);
  }

  /**
   * Get active banners
   */
  async getActiveBanners(filters = {}) {
    const now = new Date();
    const banners = await db.find('cs_banners', { status: 'active' });

    return banners.filter(banner => {
      // Check date range
      if (banner.start_date && new Date(banner.start_date) > now) return false;
      if (banner.end_date && new Date(banner.end_date) < now) return false;

      // Check type filter
      if (filters.bannerType && banner.banner_type !== filters.bannerType) return false;

      return true;
    });
  }

  /**
   * Activate banner
   */
  async activateBanner(bannerId) {
    await db.update('cs_banners', bannerId, { status: 'active', updated_at: new Date() });
  }

  // ============================================================
  // ANNOUNCEMENTS
  // ============================================================

  /**
   * Create announcement
   */
  async createAnnouncement(announcementData) {
    const announcementCode = `ANN-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cs_announcements', {
      announcement_code: announcementCode,
      title: announcementData.title,
      message: announcementData.message,
      announcement_type: announcementData.announcementType,
      severity: announcementData.severity || 'info',
      display_location: announcementData.displayLocation || 'banner',
      icon: announcementData.icon,
      image_url: announcementData.imageUrl,
      action_text: announcementData.actionText,
      action_url: announcementData.actionUrl,
      target_countries: announcementData.targetCountries || [],
      target_user_types: announcementData.targetUserTypes || [],
      target_pages: announcementData.targetPages || [],
      start_date: announcementData.startDate,
      end_date: announcementData.endDate,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get active announcements
   */
  async getActiveAnnouncements(filters = {}) {
    const now = new Date();
    const announcements = await db.find('cs_announcements', { status: 'active' });

    return announcements.filter(a => {
      if (a.start_date && new Date(a.start_date) > now) return false;
      if (a.end_date && new Date(a.end_date) < now) return false;
      return true;
    });
  }

  /**
   * Publish announcement
   */
  async publishAnnouncement(announcementId) {
    await db.update('cs_announcements', announcementId, { status: 'active' });
  }

  // ============================================================
  // PUBLISHING CALENDAR
  // ============================================================

  /**
   * Add to publishing schedule
   */
  async addToSchedule(contentType, contentId, action, scheduledAt, userId) {
    const scheduleCode = `SCH-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cs_publishing_schedule', {
      schedule_code: scheduleCode,
      content_type: contentType,
      content_id: contentId,
      action: action,
      scheduled_at: new Date(scheduledAt),
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get publishing schedule
   */
  async getPublishingSchedule(startDate, endDate) {
    const schedules = await db.find('cs_publishing_schedule', { status: 'pending' });

    const start = new Date(startDate);
    const end = new Date(endDate);

    return schedules.filter(s => {
      const scheduled = new Date(s.scheduled_at);
      return scheduled >= start && scheduled <= end;
    });
  }

  // ============================================================
  // CONTENT BLOCKS
  // ============================================================

  /**
   * Create content block
   */
  async createContentBlock(blockData) {
    const blockCode = `BLK-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cs_content_blocks', {
      block_code: blockCode,
      block_name: blockData.blockName,
      block_type: blockData.blockType,
      title: blockData.title,
      content: blockData.content,
      config: blockData.config || {},
      media_url: blockData.mediaUrl,
      media_alt: blockData.mediaAlt,
      custom_css: blockData.customCss,
      custom_class: blockData.customClass,
      is_global: blockData.isGlobal || false,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get content blocks
   */
  async getContentBlocks(filters = {}) {
    const query = { status: 'active' };
    if (filters.blockType) query.block_type = filters.blockType;
    if (filters.isGlobal !== undefined) query.is_global = filters.isGlobal;

    return db.find('cs_content_blocks', query, { sort: { created_at: -1 } });
  }

  /**
   * Get block types
   */
  async getBlockTypes() {
    return [
      { type: 'hero', name: 'Hero Section', icon: '🎯' },
      { type: 'heading', name: 'Heading', icon: '📝' },
      { type: 'paragraph', name: 'Paragraph', icon: '📄' },
      { type: 'button', name: 'Button', icon: '🔘' },
      { type: 'image', name: 'Image', icon: '🖼️' },
      { type: 'video', name: 'Video', icon: '🎬' },
      { type: 'gallery', name: 'Gallery', icon: '📷' },
      { type: 'vehicle_carousel', name: 'Vehicle Carousel', icon: '🚗' },
      { type: 'dealer_carousel', name: 'Dealer Carousel', icon: '🏢' },
      { type: 'auction_banner', name: 'Auction Banner', icon: '🔨' },
      { type: 'stats', name: 'Statistics', icon: '📊' },
      { type: 'testimonial', name: 'Testimonial', icon: '💬' },
      { type: 'faq', name: 'FAQ', icon: '❓' },
      { type: 'pricing', name: 'Pricing Table', icon: '💰' },
      { type: 'map', name: 'Map', icon: '🗺️' },
      { type: 'countdown', name: 'Countdown', icon: '⏰' },
      { type: 'newsletter', name: 'Newsletter', icon: '✉️' },
      { type: 'html', name: 'HTML Block', icon: '📄' },
      { type: 'custom', name: 'Custom Widget', icon: '🧩' },
    ];
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  /**
   * Track content view
   */
  async trackContentView(contentType, contentId, contentName) {
    const today = new Date().toISOString().split('T')[0];

    let analytics = await db.findOne('cs_analytics', {
      content_type: contentType,
      content_id: contentId,
      period_start: today,
    });

    if (analytics) {
      await db.update('cs_analytics', analytics.id, {
        views: (analytics.views || 0) + 1,
        updated_at: new Date(),
      });
    } else {
      await db.create('cs_analytics', {
        analytics_code: `AN-${Date.now().toString(36).toUpperCase()}`,
        content_type: contentType,
        content_id: contentId,
        content_name: contentName,
        views: 1,
        period_start: today,
        period_end: today,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Update content view count
    if (contentType === 'article') {
      const article = await db.findById('cs_articles', contentId);
      if (article) {
        await db.update('cs_articles', contentId, { views: (article.views || 0) + 1 });
      }
    }
  }

  /**
   * Get content analytics
   */
  async getContentAnalytics(contentType, contentId, period = '7d') {
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return db.find('cs_analytics', {
      content_type: contentType,
      content_id: contentId,
      period_start: { $gte: startDate },
    }, { sort: { period_start: 1 } });
  }

  /**
   * Get top performing content
   */
  async getTopContent(contentType, limit = 10, period = '30d') {
    const days = period === '90d' ? 90 : period === '7d' ? 7 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const analytics = await db.find('cs_analytics', {
      content_type: contentType,
      period_start: { $gte: startDate },
    });

    // Aggregate by content
    const contentStats = {};
    analytics.forEach(a => {
      if (!contentStats[a.content_id]) {
        contentStats[a.content_id] = { content_id: a.content_id, content_name: a.content_name, views: 0, conversions: 0 };
      }
      contentStats[a.content_id].views += a.views || 0;
      contentStats[a.content_id].conversions += a.conversions || 0;
    });

    return Object.values(contentStats)
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  // ============================================================
  // MEDIA LIBRARY
  // ============================================================

  /**
   * Upload media
   */
  async uploadMedia(mediaData) {
    const mediaCode = `MED-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cs_media', {
      media_code: mediaCode,
      file_name: mediaData.fileName,
      original_name: mediaData.originalName,
      media_type: mediaData.mediaType,
      mime_type: mediaData.mimeType,
      url: mediaData.url,
      thumbnail_url: mediaData.thumbnailUrl,
      optimized_url: mediaData.optimizedUrl,
      width: mediaData.width,
      height: mediaData.height,
      file_size: mediaData.fileSize,
      folder: mediaData.folder,
      tags: mediaData.tags || [],
      alt_text: mediaData.altText,
      caption: mediaData.caption,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get media items
   */
  async getMediaItems(filters = {}) {
    const query = { status: 'active' };
    if (filters.mediaType) query.media_type = filters.mediaType;
    if (filters.folder) query.folder = filters.folder;

    return db.find('cs_media', query, { sort: { created_at: -1 } });
  }

  /**
   * Search media
   */
  async searchMedia(query) {
    const media = await db.find('cs_media', { status: 'active' });
    const q = query.toLowerCase();

    return media.filter(m =>
      m.file_name.toLowerCase().includes(q) ||
      m.tags?.some(t => t.toLowerCase().includes(q)) ||
      m.folder?.toLowerCase().includes(q)
    );
  }

  /**
   * Delete media
   */
  async deleteMedia(mediaId) {
    await db.update('cs_media', mediaId, { status: 'deleted' });
  }

  // ============================================================
  // VERSION CONTROL
  // ============================================================

  /**
   * Create content version
   */
  async createVersion(contentType, contentId, snapshot, summary, userId = null, userName = null) {
    const versionCode = `VER-${Date.now().toString(36).toUpperCase()}`;

    // Get current max version
    const existingVersions = await db.find('cs_content_versions', {
      content_type: contentType,
      content_id: contentId,
    });
    const maxVersion = existingVersions.reduce((max, v) => Math.max(max, v.version_number || 0), 0);

    return db.create('cs_content_versions', {
      version_code: versionCode,
      content_type: contentType,
      content_id: contentId,
      snapshot: typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot),
      version_number: maxVersion + 1,
      change_summary: summary,
      status: 'published',
      created_by: userId,
      created_by_name: userName,
      created_at: new Date(),
      published_at: new Date(),
    });
  }

  /**
   * Get content versions
   */
  async getContentVersions(contentType, contentId) {
    return db.find('cs_content_versions', {
      content_type: contentType,
      content_id: contentId,
    }, { sort: { version_number: -1 } });
  }

  /**
   * Rollback to version
   */
  async rollbackToVersion(versionId) {
    const version = await db.findById('cs_content_versions', versionId);
    if (!version) throw new Error('Version not found');

    const snapshot = typeof version.snapshot === 'string' ? JSON.parse(version.snapshot) : version.snapshot;

    // Restore based on content type
    switch (version.content_type) {
      case 'article':
        await db.update('cs_articles', version.content_id, {
          ...snapshot,
          status: 'draft',
          updated_at: new Date(),
        });
        break;
      case 'landing_page':
        await db.update('cs_landing_pages', version.content_id, {
          ...snapshot,
          status: 'draft',
          updated_at: new Date(),
        });
        break;
    }

    return { success: true };
  }

  // ============================================================
  // WORKFLOW LOGGING
  // ============================================================

  /**
   * Log workflow action
   */
  async logWorkflow(contentId, contentType, action, userId, userName, userRole, previousStatus = null, newStatus = null, comment = null) {
    const logCode = `WF-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cs_workflow_logs', {
      log_code: logCode,
      content_type: contentType,
      content_id: contentId,
      action: action,
      actor_id: userId,
      actor_name: userName,
      actor_role: userRole,
      comment: comment,
      previous_status: previousStatus,
      new_status: newStatus,
      created_at: new Date(),
    });
  }

  /**
   * Get workflow history
   */
  async getWorkflowHistory(contentType, contentId) {
    return db.find('cs_workflow_logs', {
      content_type: contentType,
      content_id: contentId,
    }, { sort: { created_at: -1 } });
  }

  // ============================================================
  // SEARCH
  // ============================================================

  /**
   * Search all content
   */
  async searchAll(query, filters = {}) {
    const results = {
      articles: [],
      faqs: [],
      landingPages: [],
      media: [],
    };

    const q = query.toLowerCase();

    // Search articles
    if (!filters.type || filters.type === 'articles') {
      const articles = await db.find('cs_articles', { status: 'published' });
      results.articles = articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q) ||
        a.excerpt?.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q))
      ).slice(0, 10);
    }

    // Search FAQs
    if (!filters.type || filters.type === 'faqs') {
      results.faqs = await this.searchFAQs(query);
    }

    // Search landing pages
    if (!filters.type || filters.type === 'landing_pages') {
      const pages = await db.find('cs_landing_pages', { status: 'published' });
      results.landingPages = pages.filter(p =>
        p.page_name.toLowerCase().includes(q) ||
        p.hero_title?.toLowerCase().includes(q)
      ).slice(0, 5);
    }

    // Search media
    if (!filters.type || filters.type === 'media') {
      results.media = await this.searchMedia(query);
    }

    return results;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Generate slug from title
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats() {
    const articles = await db.find('cs_articles', {});
    const faqs = await db.find('cs_faqs', {});
    const campaigns = await db.find('cs_campaigns', {});
    const banners = await db.find('cs_banners', {});

    return {
      articles: {
        total: articles.length,
        published: articles.filter(a => a.status === 'published').length,
        draft: articles.filter(a => a.status === 'draft').length,
        review: articles.filter(a => a.status === 'review').length,
        scheduled: articles.filter(a => a.status === 'scheduled').length,
      },
      faqs: {
        total: faqs.length,
        published: faqs.filter(f => f.status === 'published').length,
      },
      campaigns: {
        total: campaigns.length,
        active: campaigns.filter(c => c.status === 'active').length,
      },
      banners: {
        total: banners.length,
        active: banners.filter(b => b.status === 'active').length,
      },
      totalViews: articles.reduce((sum, a) => sum + (a.views || 0), 0),
    };
  }
}

export const contentStudioService = new ContentStudioService();
export default contentStudioService;
