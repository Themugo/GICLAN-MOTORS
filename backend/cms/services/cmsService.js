// ============================================================
// KAYAD WEBSITE BUILDER / CMS
// ENHANCED CMS SERVICE - Complete Website Builder Platform
// ============================================================

import db from '../../db/index.js';
import { logInfo, logError } from '../../utils/logger.js';

/**
 * CMS Service
 * Complete Website Builder & Content Management Platform
 */
class CMSService {

  // ============================================================
  // GLOBAL WEBSITE SETTINGS
  // ============================================================

  /**
   * Get all website settings
   */
  async getWebsiteSettings() {
    let settings = await db.findOne('website_settings', { is_active: true });

    if (!settings) {
      // Create default settings
      settings = await db.create('website_settings', {
        website_name: 'KAYAD',
        website_tagline: 'Africa\'s Smartest Automotive Platform',
        primary_color: '#1e3a5f',
        secondary_color: '#64748b',
        accent_color: '#c4a484',
        success_color: '#10b981',
        warning_color: '#f59e0b',
        danger_color: '#ef4444',
        background_color: '#f5f0e8',
        surface_color: '#ffffff',
        container_max_width: '1280px',
        font_family: 'Inter, sans-serif',
        button_style: 'rounded',
        card_style: 'elevated',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return settings;
  }

  /**
   * Update website settings
   */
  async updateWebsiteSettings(settingsData, userId, userName) {
    let settings = await db.findOne('website_settings', { is_active: true });

    // Create version before update
    if (settings) {
      await this.createContentVersion('settings', settings.id, settings, 'Website settings updated', userId, userName);

      await db.update('website_settings', settings.id, {
        ...settingsData,
        updated_at: new Date(),
      });

      settings = await db.findOne('website_settings', { is_active: true });
    }

    // Log the change
    await this.logAudit({
      userId,
      userName,
      actionType: 'update',
      contentType: 'settings',
      contentId: settings?.id,
      changeSummary: 'Website settings updated',
    });

    return settings;
  }

  // ============================================================
  // PAGE MANAGEMENT
  // ============================================================

  /**
   * Get published page by slug
   */
  async getPublishedPage(slug, userRole = 'guest', countryCode = 'KE') {
    const page = await db.findOne('cms_pages', { slug, status: 'published' });
    if (!page) return null;

    // Get page sections (check visibility rules)
    const allSections = await db.find('cms_page_sections', {
      page_id: page.id,
      is_active: true
    }, { sort: { ordering: 1 } });

    // Filter sections by visibility
    const now = new Date();
    const sections = allSections.filter(s => {
      // Check mobile/desktop visibility
      if (s.show_on_mobile === false) return false;
      if (s.show_on_desktop === false) return false;

      // Check scheduling
      if (s.schedule_start && new Date(s.schedule_start) > now) return false;
      if (s.schedule_end && new Date(s.schedule_end) < now) return false;

      return true;
    });

    // Get hero section if exists
    const heroSection = sections.find(s => s.section_type === 'hero');
    let heroConfig = null;
    if (heroSection) {
      heroConfig = await db.findOne('cms_hero_sections', { section_id: heroSection.id });
    }

    // Get footer config
    const footer = await db.findOne('cms_footer_configs', { is_active: true });

    // Get global settings
    const settings = await this.getWebsiteSettings();

    // Get navigation with permission filtering
    const navigation = await this.getActiveNavigation('main', userRole, countryCode);
    const mobileNav = await this.getActiveNavigation('mobile', userRole, countryCode);

    // Get active promotions
    const promotions = await this.getActivePromotions(userRole, countryCode);

    // Get announcement
    const announcement = await this.getActiveAnnouncement();

    return {
      page,
      sections: sections.map(s => ({
        ...s,
        content: typeof s.content === 'string' ? JSON.parse(s.content) : s.content,
      })),
      hero: heroConfig,
      footer,
      settings,
      navigation,
      mobileNav,
      promotions,
      announcement,
    };
  }

  /**
   * Get all pages
   */
  async getPages(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.pageType) query.page_type = filters.pageType;

    return db.find('cms_pages', query, { sort: { page_name: 1 } });
  }

  /**
   * Create page
   */
  async createPage(pageData) {
    const pageCode = `PAGE-${Date.now().toString(36).toUpperCase()}`;

    const page = await db.create('cms_pages', {
      page_code: pageCode,
      page_name: pageData.pageName,
      page_type: pageData.pageType || 'custom',
      slug: pageData.slug,
      status: 'draft',
      version: 1,
      meta_title: pageData.metaTitle,
      meta_description: pageData.metaDescription,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create version
    await this.createContentVersion('page', page.id, { ...page, sections: [] }, 'Initial draft');

    return page;
  }

  /**
   * Update page
   */
  async updatePage(pageId, pageData) {
    const page = await db.findById('cms_pages', pageId);
    if (!page) throw new Error('Page not found');

    await db.update('cms_pages', pageId, {
      ...pageData,
      updated_at: new Date(),
    });

    return db.findById('cms_pages', pageId);
  }

  /**
   * Publish page
   */
  async publishPage(pageId, userId, userName) {
    const page = await db.findById('cms_pages', pageId);
    if (!page) throw new Error('Page not found');

    // Create version before publishing
    const sections = await db.find('cms_page_sections', { page_id: pageId });
    await this.createContentVersion('page', pageId, { ...page, sections }, 'Published', userId, userName);

    await db.update('cms_pages', pageId, {
      status: 'published',
      published_at: new Date(),
      version: page.version + 1,
      updated_at: new Date(),
    });

    return db.findById('cms_pages', pageId);
  }

  // ============================================================
  // SECTION MANAGEMENT
  // ============================================================

  /**
   * Add section to page
   */
  async addSection(pageId, sectionData) {
    const sectionCode = `SEC-${Date.now().toString(36).toUpperCase()}`;

    // Get max ordering
    const existingSections = await db.find('cms_page_sections', { page_id: pageId });
    const maxOrder = existingSections.reduce((max, s) => Math.max(max, s.ordering || 0), 0);

    const section = await db.create('cms_page_sections', {
      page_id: pageId,
      section_code: sectionCode,
      section_type: sectionData.sectionType,
      title: sectionData.title,
      subtitle: sectionData.subtitle,
      content: sectionData.content || {},
      ordering: maxOrder + 1,
      is_visible: true,
      is_active: true,
      background_color: sectionData.backgroundColor,
      background_image: sectionData.backgroundImage,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // If hero section, create hero config
    if (sectionData.sectionType === 'hero') {
      await db.create('cms_hero_sections', {
        hero_code: sectionCode,
        section_id: section.id,
        headline: sectionData.title,
        subtitle: sectionData.subtitle,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return section;
  }

  /**
   * Update section
   */
  async updateSection(sectionId, sectionData) {
    await db.update('cms_page_sections', sectionId, {
      ...sectionData,
      updated_at: new Date(),
    });

    return db.findById('cms_page_sections', sectionId);
  }

  /**
   * Reorder sections
   */
  async reorderSections(pageId, sectionOrders) {
    for (const { sectionId, ordering } of sectionOrders) {
      await db.update('cms_page_sections', sectionId, { ordering });
    }
  }

  // ============================================================
  // NAVIGATION MANAGEMENT
  // ============================================================

  /**
   * Get navigation
   */
  async getNavigation(navCode) {
    return db.findOne('cms_navigation', { nav_code: navCode });
  }

  /**
   * Get active navigation with items
   */
  async getActiveNavigation(navCode) {
    const nav = await db.findOne('cms_navigation', { nav_code: navCode, is_active: true });
    if (!nav) return null;

    // Get items
    const items = await db.find('cms_nav_items', { nav_id: nav.id, is_active: true }, { sort: { ordering: 1 } });

    // Build hierarchy
    const rootItems = items.filter(i => !i.parent_id);
    const buildHierarchy = (parentId) => {
      return items
        .filter(i => i.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildHierarchy(item.id),
        }));
    };

    return {
      ...nav,
      items: buildHierarchy(null),
    };
  }

  /**
   * Update navigation
   */
  async updateNavigation(navCode, navData) {
    const nav = await db.findOne('cms_navigation', { nav_code: navCode });
    if (!nav) throw new Error('Navigation not found');

    await db.update('cms_navigation', nav.id, {
      items: navData.items,
      settings: navData.settings,
      updated_at: new Date(),
    });

    // Create version
    await this.createContentVersion('navigation', nav.id, navData);

    return db.findOne('cms_navigation', { nav_code: navCode });
  }

  /**
   * Add navigation item
   */
  async addNavItem(navId, itemData) {
    const itemCode = `NAV-${Date.now().toString(36).toUpperCase()}`;

    // Get max ordering
    const existingItems = await db.find('cms_nav_items', { nav_id: navId, parent_id: itemData.parentId });
    const maxOrder = existingItems.reduce((max, i) => Math.max(max, i.ordering || 0), 0);

    const item = await db.create('cms_nav_items', {
      nav_id: navId,
      item_code: itemCode,
      label: itemData.label,
      url: itemData.url,
      item_type: itemData.itemType || 'link',
      icon: itemData.icon,
      badge: itemData.badge,
      parent_id: itemData.parentId,
      ordering: maxOrder + 1,
      is_visible: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return item;
  }

  // ============================================================
  // THEME MANAGEMENT
  // ============================================================

  /**
   * Get active theme
   */
  async getActiveTheme() {
    return db.findOne('cms_theme_configs', { is_active: true });
  }

  /**
   * Update theme
   */
  async updateTheme(themeCode, themeData) {
    const theme = await db.findOne('cms_theme_configs', { theme_code: themeCode });
    if (!theme) throw new Error('Theme not found');

    // Create version before update
    await this.createContentVersion('theme', theme.id, themeData);

    await db.update('cms_theme_configs', theme.id, {
      colors: themeData.colors || theme.colors,
      typography: themeData.typography || theme.typography,
      spacing: themeData.spacing || theme.spacing,
      border_radius: themeData.borderRadius || theme.border_radius,
      shadows: themeData.shadows || theme.shadows,
      buttons: themeData.buttons || theme.buttons,
      updated_at: new Date(),
    });

    return db.findOne('cms_theme_configs', { theme_code: themeCode });
  }

  /**
   * Create new theme
   */
  async createTheme(themeData) {
    const themeCode = `THEME-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cms_theme_configs', {
      theme_code: themeCode,
      theme_name: themeData.themeName,
      colors: themeData.colors || {},
      typography: themeData.typography || {},
      is_active: false,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // ============================================================
  // CAR CARD CONFIG
  // ============================================================

  /**
   * Get car card config
   */
  async getCarCardConfig(configCode = 'default') {
    const config = await db.findOne('cms_car_card_configs', {
      config_code: configCode
    });
    if (!config) {
      // Return default config
      return {
        config_code: 'default',
        config_name: 'Default',
        card_style: 'default',
        fields_to_show: ['photo', 'price', 'title', 'location', 'mileage', 'transmission'],
        columns_desktop: 4,
        pagination_type: 'numbered',
      };
    }
    return {
      ...config,
      fields_to_show: typeof config.fields_to_show === 'string'
        ? JSON.parse(config.fields_to_show)
        : config.fields_to_show,
      fields_order: typeof config.fields_order === 'string'
        ? JSON.parse(config.fields_order)
        : config.fields_order,
    };
  }

  /**
   * Update car card config
   */
  async updateCarCardConfig(configCode, configData) {
    const config = await db.findOne('cms_car_card_configs', { config_code: configCode });
    if (!config) throw new Error('Config not found');

    await db.update('cms_car_card_configs', config.id, {
      ...configData,
      updated_at: new Date(),
    });

    return this.getCarCardConfig(configCode);
  }

  // ============================================================
  // POPUP MANAGEMENT
  // ============================================================

  /**
   * Get active popup
   */
  async getActivePopup() {
    const now = new Date();

    const popup = await db.findOne('cms_popups', {
      status: 'active',
      start_date: { $lte: now },
      end_date: { $gte: now },
    });

    if (popup) {
      // Increment impressions
      await db.update('cms_popups', popup.id, {
        impressions: popup.impressions + 1,
      });
    }

    return popup;
  }

  /**
   * Get all popups
   */
  async getPopups(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;

    return db.find('cms_popups', query, { sort: { created_at: -1 } });
  }

  /**
   * Create popup
   */
  async createPopup(popupData) {
    const popupCode = `POPUP-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cms_popups', {
      popup_code: popupCode,
      popup_name: popupData.popupName,
      title: popupData.title,
      content: popupData.content,
      popup_type: popupData.popupType || 'announcement',
      size: popupData.size || 'medium',
      start_date: popupData.startDate,
      end_date: popupData.endDate,
      auto_open: popupData.autoOpen || false,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // ============================================================
  // FOOTER MANAGEMENT
  // ============================================================

  /**
   * Get active footer
   */
  async getActiveFooter() {
    return db.findOne('cms_footer_configs', { is_active: true });
  }

  /**
   * Update footer
   */
  async updateFooter(footerCode, footerData) {
    const footer = await db.findOne('cms_footer_configs', { footer_code: footerCode });
    if (!footer) throw new Error('Footer not found');

    await db.update('cms_footer_configs', footer.id, {
      columns: footerData.columns || footer.columns,
      copyright_text: footerData.copyrightText,
      policies: footerData.policies || footer.policies,
      social_links: footerData.socialLinks || footer.social_links,
      show_app_download: footerData.showAppDownload,
      app_store_urls: footerData.appStoreUrls,
      show_newsletter: footerData.showNewsletter,
      newsletter_placeholder: footerData.newsletterPlaceholder,
      newsletter_button_text: footerData.newsletterButtonText,
      updated_at: new Date(),
    });

    return db.findOne('cms_footer_configs', { footer_code: footerCode });
  }

  // ============================================================
  // MEDIA LIBRARY
  // ============================================================

  /**
   * Get media items
   */
  async getMediaItems(filters = {}) {
    const query = { status: 'active' };
    if (filters.mediaType) query.media_type = filters.mediaType;
    if (filters.folder) query.folder = filters.folder;

    return db.find('cms_media', query, { sort: { created_at: -1 } });
  }

  /**
   * Upload media
   */
  async uploadMedia(mediaData) {
    const mediaCode = `MEDIA-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cms_media', {
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
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // ============================================================
  // FORMS
  // ============================================================

  /**
   * Get form
   */
  async getForm(formCode) {
    return db.findOne('cms_forms', { form_code: formCode, status: 'active' });
  }

  /**
   * Submit form
   */
  async submitForm(formCode, formData) {
    const form = await db.findOne('cms_forms', { form_code: formCode });
    if (!form) throw new Error('Form not found');

    // Update submission count
    await db.update('cms_forms', form.id, {
      total_submissions: (form.total_submissions || 0) + 1,
    });

    // In production, would save submission and send notifications
    return { success: true, message: 'Form submitted successfully' };
  }

  // ============================================================
  // ANNOUNCEMENTS
  // ============================================================

  /**
   * Get active announcement
   */
  async getActiveAnnouncement() {
    const now = new Date();

    return db.findOne('cms_announcements', {
      status: 'active',
      start_date: { $lte: now },
      end_date: { $gte: now },
    });
  }

  // ============================================================
  // PROMOTIONS
  // ============================================================

  /**
   * Get active promotions
   */
  async getActivePromotions(userRole = 'all', countryCode = 'KE') {
    const now = new Date();

    const promotions = await db.find('cms_promotions', {
      status: 'active',
      start_date: { $lte: now },
      end_date: { $gte: now },
    });

    // Filter by targeting
    return promotions.filter(p => {
      const targets = p.target_user_types || ['all'];
      return targets.includes('all') || targets.includes(userRole);
    });
  }

  /**
   * Get all promotions
   */
  async getPromotions(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.promotionType) query.promotion_type = filters.promotionType;

    return db.find('cms_promotions', query, { sort: { created_at: -1 } });
  }

  /**
   * Create promotion
   */
  async createPromotion(promotionData) {
    const promotionCode = `PROMO-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cms_promotions', {
      promotion_code: promotionCode,
      promotion_name: promotionData.promotionName,
      description: promotionData.description,
      promotion_type: promotionData.promotionType,
      title: promotionData.title,
      subtitle: promotionData.subtitle,
      content: promotionData.content,
      cta_text: promotionData.ctaText,
      cta_url: promotionData.ctaUrl,
      image_url: promotionData.imageUrl,
      position: promotionData.position,
      size: promotionData.size,
      target_pages: promotionData.targetPages || [],
      target_countries: promotionData.targetCountries || [],
      target_user_types: promotionData.targetUserTypes || ['all'],
      start_date: promotionData.startDate,
      end_date: promotionData.endDate,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Update promotion
   */
  async updatePromotion(promotionId, promotionData) {
    await db.update('cms_promotions', promotionId, {
      ...promotionData,
      updated_at: new Date(),
    });

    return db.findById('cms_promotions', promotionId);
  }

  /**
   * Track promotion impression
   */
  async trackPromotionImpression(promotionId) {
    const promotion = await db.findById('cms_promotions', promotionId);
    if (promotion) {
      await db.update('cms_promotions', promotionId, {
        impressions: (promotion.impressions || 0) + 1,
      });
    }
  }

  /**
   * Track promotion click
   */
  async trackPromotionClick(promotionId) {
    const promotion = await db.findById('cms_promotions', promotionId);
    if (promotion) {
      await db.update('cms_promotions', promotionId, {
        clicks: (promotion.clicks || 0) + 1,
      });
    }
  }

  // ============================================================
  // MEDIA LIBRARY
  // ============================================================

  /**
   * Get media items
   */
  async getMediaItems(filters = {}) {
    const query = { status: 'active' };
    if (filters.mediaType) query.media_type = filters.mediaType;
    if (filters.folder) query.folder = filters.folder;

    return db.find('cms_media', query, { sort: { created_at: -1 } });
  }

  /**
   * Upload media
   */
  async uploadMedia(mediaData) {
    const mediaCode = `MEDIA-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cms_media', {
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
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Delete media
   */
  async deleteMedia(mediaId) {
    await db.update('cms_media', mediaId, {
      status: 'deleted',
      updated_at: new Date(),
    });
  }

  // ============================================================
  // FORMS
  // ============================================================

  /**
   * Get form
   */
  async getForm(formCode) {
    return db.findOne('cms_forms', { form_code: formCode, status: 'active' });
  }

  /**
   * Get form submissions
   */
  async getFormSubmissions(formId, filters = {}) {
    const query = { form_id: formId };
    if (filters.status) query.status = filters.status;

    return db.find('cms_form_submissions', query, { sort: { created_at: -1 } });
  }

  /**
   * Submit form
   */
  async submitForm(formCode, formData, userInfo = {}) {
    const form = await db.findOne('cms_forms', { form_code: formCode });
    if (!form) throw new Error('Form not found');

    const submissionCode = `SUB-${Date.now().toString(36).toUpperCase()}`;

    // Save submission
    const submission = await db.create('cms_form_submissions', {
      submission_code: submissionCode,
      form_id: form.id,
      form_data: formData,
      user_id: userInfo.userId,
      user_email: userInfo.email,
      user_ip: userInfo.ip,
      user_agent: userInfo.userAgent,
      status: 'new',
      created_at: new Date(),
    });

    // Update submission count
    await db.update('cms_forms', form.id, {
      total_submissions: (form.total_submissions || 0) + 1,
      last_submission_at: new Date(),
    });

    return { success: true, submissionCode, submission };
  }

  /**
   * Create form
   */
  async createForm(formData) {
    const formCode = `FORM-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cms_forms', {
      form_code: formCode,
      form_name: formData.formName,
      form_type: formData.formType,
      fields: formData.fields || [],
      submit_button_text: formData.submitButtonText || 'Submit',
      success_message: formData.successMessage,
      redirect_url: formData.redirectUrl,
      notify_enabled: formData.notifyEnabled || false,
      notify_email: formData.notifyEmail,
      captcha_enabled: formData.captchaEnabled !== false,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // ============================================================
  // SEO
  // ============================================================

  /**
   * Get SEO config
   */
  async getSEOConfig() {
    return db.findOne('cms_seo_configs', { is_active: true });
  }

  /**
   * Update SEO config
   */
  async updateSEOConfig(configData, userId, userName) {
    let config = await db.findOne('cms_seo_configs', { is_active: true });

    if (config) {
      // Create version
      await this.createContentVersion('seo', config.id, config, 'SEO config updated', userId, userName);

      await db.update('cms_seo_configs', config.id, {
        ...configData,
        updated_at: new Date(),
      });

      config = await db.findOne('cms_seo_configs', { is_active: true });
    } else {
      config = await db.create('cms_seo_configs', {
        config_code: 'SEO-DEFAULT',
        ...configData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return config;
  }

  // ============================================================
  // AUDIT LOG
  // ============================================================

  /**
   * Log audit entry
   */
  async logAudit(auditData) {
    const logCode = `AUDIT-${Date.now().toString(36).toUpperCase()}`;

    return db.create('cms_audit_log', {
      log_code: logCode,
      user_id: auditData.userId,
      user_name: auditData.userName,
      user_role: auditData.userRole,
      action_type: auditData.actionType,
      content_type: auditData.contentType,
      content_id: auditData.contentId,
      content_name: auditData.contentName,
      before_state: auditData.beforeState,
      after_state: auditData.afterState,
      change_summary: auditData.changeSummary,
      ip_address: auditData.ipAddress,
      user_agent: auditData.userAgent,
      created_at: new Date(),
    });
  }

  /**
   * Get audit log
   */
  async getAuditLog(filters = {}) {
    const query = {};
    if (filters.contentType) query.content_type = filters.contentType;
    if (filters.userId) query.user_id = filters.userId;
    if (filters.actionType) query.action_type = filters.actionType;

    return db.find('cms_audit_log', query, { sort: { created_at: -1 }, limit: filters.limit || 100 });
  }

  // ============================================================
  // USER PERMISSIONS
  // ============================================================

  /**
   * Get user permissions
   */
  async getUserPermissions(userId) {
    let permissions = await db.findOne('cms_user_permissions', { user_id: userId, is_active: true });

    if (!permissions) {
      // Return default viewer permissions
      permissions = {
        role: 'viewer',
        can_edit_pages: false,
        can_edit_navigation: false,
        can_edit_theme: false,
        can_edit_promotions: false,
        can_manage_media: false,
        can_manage_forms: false,
        can_publish: false,
        can_manage_users: false,
        can_view_analytics: false,
        can_manage_seo: false,
      };
    }

    return permissions;
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(userId, permissionsData) {
    let permissions = await db.findOne('cms_user_permissions', { user_id: userId });

    if (permissions) {
      await db.update('cms_user_permissions', permissions.id, {
        ...permissionsData,
        updated_at: new Date(),
      });
    } else {
      permissions = await db.create('cms_user_permissions', {
        user_id: userId,
        user_email: permissionsData.email,
        user_name: permissionsData.name,
        role: permissionsData.role,
        ...permissionsData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return permissions;
  }

  // ============================================================
  // CONTENT VERSIONS
  // ============================================================

  /**
   * Create content version
   */
  async createContentVersion(contentType, contentId, snapshot, summary, userId = null, userName = null) {
    const versionCode = `VER-${Date.now().toString(36).toUpperCase()}`;

    // Get current max version
    const existingVersions = await db.find('cms_content_versions', {
      content_type: contentType,
      content_id: contentId,
    });
    const maxVersion = existingVersions.reduce((max, v) => Math.max(max, v.version_number || 0), 0);

    return db.create('cms_content_versions', {
      version_code: versionCode,
      content_type: contentType,
      content_id: contentId,
      snapshot: typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot),
      version_number: maxVersion + 1,
      change_summary: summary,
      status: 'draft',
      created_by: userId,
      created_by_name: userName,
      created_at: new Date(),
    });
  }

  /**
   * Get content versions
   */
  async getContentVersions(contentType, contentId) {
    return db.find('cms_content_versions', {
      content_type: contentType,
      content_id: contentId,
    }, { sort: { version_number: -1 } });
  }

  /**
   * Rollback to version
   */
  async rollbackToVersion(versionId, userId, userName) {
    const version = await db.findById('cms_content_versions', versionId);
    if (!version) throw new Error('Version not found');

    const snapshot = typeof version.snapshot === 'string'
      ? JSON.parse(version.snapshot)
      : version.snapshot;

    // Restore based on content type
    switch (version.content_type) {
      case 'page':
        await db.update('cms_pages', version.content_id, {
          ...snapshot,
          updated_at: new Date(),
        });
        break;
      case 'settings':
        await db.update('website_settings', version.content_id, {
          ...snapshot,
          updated_at: new Date(),
        });
        break;
      case 'navigation':
        await db.update('cms_navigation', version.content_id, {
          ...snapshot,
          updated_at: new Date(),
        });
        break;
      case 'footer':
        await db.update('cms_footer_configs', version.content_id, {
          ...snapshot,
          updated_at: new Date(),
        });
        break;
      case 'seo':
        await db.update('cms_seo_configs', version.content_id, {
          ...snapshot,
          updated_at: new Date(),
        });
        break;
    }

    // Log the rollback
    await this.logAudit({
      userId,
      userName,
      actionType: 'rollback',
      contentType: version.content_type,
      contentId: version.content_id,
      changeSummary: `Rolled back to version ${version.version_number}`,
    });

    return { success: true };
  }

  // ============================================================
  // A/B TESTING
  // ============================================================

  /**
   * Get A/B test for content
   */
  async getActiveABTest(targetType, targetId) {
    return db.findOne('cms_ab_tests', {
      target_type: targetType,
      target_id: targetId,
      status: 'running',
    });
  }

  /**
   * Get variant for user
   */
  async getVariantForUser(testId, userId) {
    const test = await db.findById('cms_ab_tests', testId);
    if (!test || !test.variants) return null;

    // Simple hash-based distribution
    const hash = (userId || 'anonymous').split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const random = Math.abs(hash) % 100;
    let cumulative = 0;

    for (const variant of test.variants) {
      cumulative += variant.weight || 50;
      if (random < cumulative) {
        return variant;
      }
    }

    return test.variants[0];
  }

  /**
   * Track A/B test conversion
   */
  async trackABConversion(testId, variantId, metric) {
    const test = await db.findById('cms_ab_tests', testId);
    if (!test || !test.metrics) return;

    const metrics = { ...test.metrics };
    if (!metrics[variantId]) {
      metrics[variantId] = {};
    }
    metrics[variantId][metric] = (metrics[variantId][metric] || 0) + 1;

    await db.update('cms_ab_tests', testId, { metrics });
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize default CMS content
   */
  async initializeDefaults() {
    // Create default settings
    await this.getWebsiteSettings();

    // Create default page
    const existingPage = await db.findOne('cms_pages', { slug: '/' });
    if (!existingPage) {
      await this.createPage({
        pageName: 'Homepage',
        pageType: 'homepage',
        slug: '/',
        metaTitle: 'KAYAD - Africa\'s Smartest Automotive Platform',
        metaDescription: 'Buy, sell, auction and finance vehicles with confidence on East Africa\'s most trusted automotive platform.',
      });
    }

    // Create default navigation
    const existingNav = await db.findOne('cms_navigation', { nav_code: 'main' });
    if (!existingNav) {
      const nav = await db.create('cms_navigation', {
        nav_code: 'main',
        nav_name: 'Main Navigation',
        settings: JSON.stringify({ sticky: true, transparent: false }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Add default nav items
      const defaultItems = [
        { label: 'Buy', url: '/marketplace', item_type: 'link', ordering: 1 },
        { label: 'Sell', url: '/sell', item_type: 'link', ordering: 2 },
        { label: 'Auction', url: '/auction', item_type: 'link', ordering: 3 },
        { label: 'Finance', url: '/finance', item_type: 'link', ordering: 4 },
        { label: 'Inspect', url: '/inspection', item_type: 'link', ordering: 5 },
        { label: 'Dealers', url: '/dealers', item_type: 'link', ordering: 6 },
      ];

      for (const item of defaultItems) {
        await db.create('cms_nav_items', {
          nav_id: nav.id,
          item_code: `NAV-${Date.now().toString(36)}`,
          ...item,
          is_visible: true,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    // Create default footer
    const existingFooter = await db.findOne('cms_footer_configs', { footer_code: 'default' });
    if (!existingFooter) {
      await db.create('cms_footer_configs', {
        footer_code: 'default',
        config_name: 'Default Footer',
        columns: JSON.stringify([
          { title: 'Marketplace', links: [
            { label: 'Buy a Car', url: '/marketplace' },
            { label: 'Sell a Car', url: '/sell' },
            { label: 'Auction', url: '/auction' },
          ]},
          { title: 'Services', links: [
            { label: 'Finance', url: '/finance' },
            { label: 'Inspection', url: '/inspection' },
            { label: 'Escrow', url: '/escrow' },
          ]},
          { title: 'Company', links: [
            { label: 'About Us', url: '/about' },
            { label: 'Contact', url: '/contact' },
            { label: 'Careers', url: '/careers' },
          ]},
          { title: 'Legal', links: [
            { label: 'Privacy Policy', url: '/privacy' },
            { label: 'Terms of Service', url: '/terms' },
            { label: 'Cookie Policy', url: '/cookies' },
          ]},
        ]),
        show_newsletter: true,
        newsletter_placeholder: 'Enter your email',
        newsletter_button_text: 'Subscribe',
        copyright_text: '© 2026 KAYAD. All rights reserved.',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Create default SEO config
    const existingSeo = await db.findOne('cms_seo_configs', { config_code: 'SEO-DEFAULT' });
    if (!existingSeo) {
      await db.create('cms_seo_configs', {
        config_code: 'SEO-DEFAULT',
        site_name: 'KAYAD',
        site_tagline: 'Africa\'s Smartest Automotive Platform',
        default_meta_title: 'KAYAD - Africa\'s Smartest Automotive Platform',
        default_meta_description: 'Buy, sell, auction and finance vehicles with confidence on East Africa\'s most trusted automotive platform.',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Create default car grid config
    const existingCarGrid = await db.findOne('cms_car_grid_configs', { config_code: 'default' });
    if (!existingCarGrid) {
      await db.create('cms_car_grid_configs', {
        config_code: 'default',
        config_name: 'Default Car Grid',
        display_mode: 'grid',
        columns_desktop: 4,
        columns_tablet: 2,
        columns_mobile: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    logInfo('CMS defaults initialized');
  }
}

export const cmsService = new CMSService();
export default cmsService;
