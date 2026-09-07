import CMSPage from "../models/CMSPage.js";
import CMSContent from "../models/CMSContent.js";
import CMSMedia from "../models/CMSMedia.js";
import CMSCampaign from "../models/CMSCampaign.js";
import CMSBanner from "../models/CMSBanner.js";
import CMSFaq from "../models/CMSFaq.js";
import CMSTaxonomy from "../models/CMSTaxonomy.js";
import CMSRevision from "../models/CMSRevision.js";
import CMSABTest from "../models/CMSABTest.js";
import CMSAnalytics from "../models/CMSAnalytics.js";
import { v4 as uuidv4 } from "uuid";

// ============================================
// PAGES
// ============================================

export async function getPages(req, res) {
  const { status, type, search, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (type) filter.pageType = type;
  if (search) {
    filter.$or = [
      { title: { $ilike: `%${search}%` } },
      { slug: { $ilike: `%${search}%` } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const pages = await CMSPage.find(filter)
    .sort({ updatedAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await CMSPage.countDocuments(filter);

  res.json({
    data: pages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}

export async function getPageById(req, res) {
  const { id } = req.params;
  const page = await CMSPage.findById(id);
  if (!page) {
    return res.status(404).json({ error: "Page not found" });
  }
  res.json(page);
}

export async function getPageBySlug(req, res) {
  const { slug } = req.params;
  const page = await CMSPage.findOne({ slug, status: "published" });
  if (!page) {
    return res.status(404).json({ error: "Page not found" });
  }
  res.json(page);
}

export async function createPage(req, res) {
  const { title, slug, pageType, content, seo, status, scheduleAt, targetAudience, personalization } = req.body;

  const existingPage = await CMSPage.findOne({ slug });
  if (existingPage) {
    return res.status(400).json({ error: "Page with this slug already exists" });
  }

  const page = await CMSPage.create({
    title,
    slug,
    pageType: pageType || "page",
    content: content || [],
    seo: seo || {},
    status: status || "draft",
    scheduleAt: scheduleAt || null,
    targetAudience: targetAudience || {},
    personalization: personalization || {},
    createdBy: req.user?.id,
    updatedBy: req.user?.id,
    version: 1
  });

  // Create initial revision
  await CMSRevision.create({
    contentId: page.id,
    contentType: "page",
    version: 1,
    data: { title, slug, pageType, content, seo },
    createdBy: req.user?.id
  });

  res.status(201).json(page);
}

export async function updatePage(req, res) {
  const { id } = req.params;
  const { title, slug, pageType, content, seo, status, scheduleAt, targetAudience, personalization } = req.body;

  const existingPage = await CMSPage.findById(id);
  if (!existingPage) {
    return res.status(404).json({ error: "Page not found" });
  }

  if (slug !== existingPage.slug) {
    const slugConflict = await CMSPage.findOne({ slug, _id: { $ne: id } });
    if (slugConflict) {
      return res.status(400).json({ error: "Page with this slug already exists" });
    }
  }

  const updatedPage = await CMSPage.findByIdAndUpdate(id, {
    $set: {
      title,
      slug,
      pageType,
      content,
      seo,
      status,
      scheduleAt,
      targetAudience,
      personalization,
      updatedBy: req.user?.id,
      updatedAt: new Date().toISOString(),
      version: existingPage.version + 1
    }
  });

  // Create revision
  await CMSRevision.create({
    contentId: id,
    contentType: "page",
    version: updatedPage.version,
    data: { title, slug, pageType, content, seo },
    createdBy: req.user?.id
  });

  res.json(updatedPage);
}

export async function deletePage(req, res) {
  const { id } = req.params;
  await CMSPage.findByIdAndDelete(id);
  res.json({ success: true });
}

export async function publishPage(req, res) {
  const { id } = req.params;
  const page = await CMSPage.findByIdAndUpdate(id, {
    $set: {
      status: "published",
      publishedAt: new Date().toISOString(),
      updatedBy: req.user?.id
    }
  });
  res.json(page);
}

export async function unpublishPage(req, res) {
  const { id } = req.params;
  const page = await CMSPage.findByIdAndUpdate(id, {
    $set: {
      status: "archived",
      updatedBy: req.user?.id
    }
  });
  res.json(page);
}

export async function schedulePage(req, res) {
  const { id } = req.params;
  const { scheduleAt } = req.body;
  const page = await CMSPage.findByIdAndUpdate(id, {
    $set: {
      scheduleAt,
      status: "scheduled",
      updatedBy: req.user?.id
    }
  });
  res.json(page);
}

export async function rollbackPage(req, res) {
  const { id } = req.params;
  const { version } = req.body;

  const revision = await CMSRevision.findOne({
    contentId: id,
    contentType: "page",
    version: parseInt(version)
  });

  if (!revision) {
    return res.status(404).json({ error: "Revision not found" });
  }

  const page = await CMSPage.findByIdAndUpdate(id, {
    $set: {
      ...revision.data,
      updatedBy: req.user?.id,
      version: (await CMSPage.findById(id)).version + 1
    }
  });

  await CMSRevision.create({
    contentId: id,
    contentType: "page",
    version: page.version,
    data: revision.data,
    createdBy: req.user?.id,
    note: `Rolled back to version ${version}`
  });

  res.json(page);
}

// ============================================
// BLOG / CONTENT
// ============================================

export async function getContents(req, res) {
  const { status, contentType, category, tags, search, page = 1, limit = 20 } = req.query;
  const filter = {};

  // Fixed: this route is now genuinely public (see routes/cmsRoutes.js
  // - it sits right next to its own public siblings /content/s/:slug
  // and /content/:id, clearly intended to be public by the same
  // comment/grouping, but was accidentally left after router.use(protect)
  // until this fix). Since there is no real req.user on a public
  // request, an unauthenticated caller must never be able to request
  // draft/archived content by simply passing a different status value
  // - only a genuinely authenticated request may see anything other
  // than published content.
  if (req.user) {
    if (status) filter.status = status;
  } else {
    filter.status = "published";
  }
  if (contentType) filter.contentType = contentType;
  if (category) filter.category = category;
  if (tags) filter.tags = { $contains: tags.split(",") };
  if (search) {
    filter.$or = [
      { title: { $ilike: `%${search}%` } },
      { excerpt: { $ilike: `%${search}%` } },
      { body: { $ilike: `%${search}%` } }
    ];
  }

  // Fixed: reproduced directly - _sort/_order/_page/_limit were being
  // passed as part of the filter object itself, but this project's
  // real query builder (models/_base.js) treats every key in a filter
  // as a real column to match against, not a special pagination/sort
  // instruction - every real request threw ("column cms_contents._sort
  // does not exist"). The real, correct pattern (matching this
  // project's own other controllers, e.g. .find(filter).sort({...}))
  // chains .sort()/.limit()/.skip() separately instead.
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const contents = await CMSContent.find(filter)
    .sort({ publishedAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await CMSContent.countDocuments(filter);

  res.json({
    data: contents,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
}

export async function getContentById(req, res) {
  const { id } = req.params;
  const content = await CMSContent.findOne({ id, status: "published" });
  if (!content) {
    return res.status(404).json({ error: "Content not found" });
  }
  res.json(content);
}

export async function getContentBySlug(req, res) {
  const { slug } = req.params;
  const content = await CMSContent.findOne({ slug, status: "published" });
  if (!content) {
    return res.status(404).json({ error: "Content not found" });
  }
  res.json(content);
}

export async function createContent(req, res) {
  const {
    title, slug, contentType, body, excerpt, featuredImage,
    category, tags, author, seo, status, scheduleAt, featured, relatedArticles
  } = req.body;

  const existingContent = await CMSContent.findOne({ slug });
  if (existingContent) {
    return res.status(400).json({ error: "Content with this slug already exists" });
  }

  // Calculate estimated reading time
  const wordCount = body ? body.replace(/<[^>]*>/g, "").split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200);

  const content = await CMSContent.create({
    title,
    slug,
    contentType: contentType || "article",
    body: body || "",
    excerpt: excerpt || "",
    featuredImage: featuredImage || "",
    category: category || "",
    tags: tags || [],
    author: author || req.user?.id,
    seo: seo || {},
    status: status || "draft",
    scheduleAt: scheduleAt || null,
    featured: featured || false,
    relatedArticles: relatedArticles || [],
    readingTime,
    createdBy: req.user?.id,
    updatedBy: req.user?.id,
    version: 1
  });

  await CMSRevision.create({
    contentId: content.id,
    contentType: "content",
    version: 1,
    data: { title, slug, contentType, body, excerpt, featuredImage, category, tags, author, seo },
    createdBy: req.user?.id
  });

  res.status(201).json(content);
}

export async function updateContent(req, res) {
  const { id } = req.params;
  const { title, slug, contentType, body, excerpt, featuredImage, category, tags, author, seo, status, scheduleAt, featured, relatedArticles } = req.body;

  const existingContent = await CMSContent.findById(id);
  if (!existingContent) {
    return res.status(404).json({ error: "Content not found" });
  }

  if (slug !== existingContent.slug) {
    const slugConflict = await CMSContent.findOne({ slug, _id: { $ne: id } });
    if (slugConflict) {
      return res.status(400).json({ error: "Content with this slug already exists" });
    }
  }

  const wordCount = body ? body.replace(/<[^>]*>/g, "").split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200);

  const updatedContent = await CMSContent.findByIdAndUpdate(id, {
    $set: {
      title, slug, contentType, body, excerpt, featuredImage,
      category, tags, author, seo, status, scheduleAt, featured, relatedArticles,
      readingTime,
      updatedBy: req.user?.id,
      updatedAt: new Date().toISOString(),
      version: existingContent.version + 1
    }
  });

  await CMSRevision.create({
    contentId: id,
    contentType: "content",
    version: updatedContent.version,
    data: { title, slug, contentType, body, excerpt, featuredImage, category, tags, author, seo },
    createdBy: req.user?.id
  });

  res.json(updatedContent);
}

export async function deleteContent(req, res) {
  const { id } = req.params;
  await CMSContent.findByIdAndDelete(id);
  res.json({ success: true });
}

// ============================================
// FAQS
// ============================================

export async function getFaqs(req, res) {
  const { category, search, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { question: { $ilike: `%${search}%` } },
      { answer: { $ilike: `%${search}%` } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const faqs = await CMSFaq.find(filter)
    .sort({ popularity: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json({ data: faqs });
}

export async function getFaqById(req, res) {
  const { id } = req.params;
  const faq = await CMSFaq.findById(id);
  if (!faq) {
    return res.status(404).json({ error: "FAQ not found" });
  }
  res.json(faq);
}

export async function createFaq(req, res) {
  const { question, answer, category, order, relatedQuestions } = req.body;

  const faq = await CMSFaq.create({
    question,
    answer,
    category: category || "general",
    order: order || 0,
    popularity: 0,
    relatedQuestions: relatedQuestions || [],
    createdBy: req.user?.id,
    updatedBy: req.user?.id
  });

  res.status(201).json(faq);
}

export async function updateFaq(req, res) {
  const { id } = req.params;
  const { question, answer, category, order, relatedQuestions } = req.body;

  const faq = await CMSFaq.findByIdAndUpdate(id, {
    $set: {
      question, answer, category, order, relatedQuestions,
      updatedBy: req.user?.id
    }
  });

  res.json(faq);
}

export async function deleteFaq(req, res) {
  const { id } = req.params;
  await CMSFaq.findByIdAndDelete(id);
  res.json({ success: true });
}

export async function incrementFaqPopularity(req, res) {
  const { id } = req.params;
  await CMSFaq.findByIdAndUpdate(id, { $inc: { popularity: 1 } });
  res.json({ success: true });
}

// ============================================
// CAMPAIGNS
// ============================================

export async function getCampaigns(req, res) {
  const { status, type, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (type) filter.campaignType = type;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const campaigns = await CMSCampaign.find(filter)
    .sort({ startDate: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json({ data: campaigns });
}

export async function getCampaignById(req, res) {
  const { id } = req.params;
  const campaign = await CMSCampaign.findById(id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }
  res.json(campaign);
}

export async function createCampaign(req, res) {
  const {
    name, campaignType, description, discount, banner,
    startDate, endDate, targetAudience, status, highlights, terms
  } = req.body;

  const campaign = await CMSCampaign.create({
    name,
    campaignType: campaignType || "promotion",
    description: description || "",
    discount: discount || {},
    banner: banner || {},
    startDate: startDate || new Date().toISOString(),
    endDate: endDate || null,
    targetAudience: targetAudience || {},
    status: status || "draft",
    highlights: highlights || [],
    terms: terms || "",
    createdBy: req.user?.id,
    updatedBy: req.user?.id
  });

  res.status(201).json(campaign);
}

export async function updateCampaign(req, res) {
  const { id } = req.params;
  const { name, campaignType, description, discount, banner, startDate, endDate, targetAudience, status, highlights, terms } = req.body;

  const campaign = await CMSCampaign.findByIdAndUpdate(id, {
    $set: {
      name, campaignType, description, discount, banner,
      startDate, endDate, targetAudience, status, highlights, terms,
      updatedBy: req.user?.id
    }
  });

  res.json(campaign);
}

export async function deleteCampaign(req, res) {
  const { id } = req.params;
  await CMSCampaign.findByIdAndDelete(id);
  res.json({ success: true });
}

// ============================================
// BANNERS
// ============================================

export async function getBanners(req, res) {
  const { type, status, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (type) filter.bannerType = type;
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const banners = await CMSBanner.find(filter)
    .sort({ order: 1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json({ data: banners });
}

export async function getBannerById(req, res) {
  const { id } = req.params;
  const banner = await CMSBanner.findById(id);
  if (!banner) {
    return res.status(404).json({ error: "Banner not found" });
  }
  res.json(banner);
}

export async function createBanner(req, res) {
  const {
    title, bannerType, desktopImage, tabletImage, mobileImage,
    link, targetAudience, status, order, scheduleAt, scheduleEnd
  } = req.body;

  const banner = await CMSBanner.create({
    title,
    bannerType: bannerType || "hero",
    desktopImage: desktopImage || "",
    tabletImage: tabletImage || "",
    mobileImage: mobileImage || "",
    link: link || "",
    targetAudience: targetAudience || {},
    status: status || "draft",
    order: order || 0,
    scheduleAt: scheduleAt || null,
    scheduleEnd: scheduleEnd || null,
    createdBy: req.user?.id,
    updatedBy: req.user?.id
  });

  res.status(201).json(banner);
}

export async function updateBanner(req, res) {
  const { id } = req.params;
  const { title, bannerType, desktopImage, tabletImage, mobileImage, link, targetAudience, status, order, scheduleAt, scheduleEnd } = req.body;

  const banner = await CMSBanner.findByIdAndUpdate(id, {
    $set: {
      title, bannerType, desktopImage, tabletImage, mobileImage,
      link, targetAudience, status, order, scheduleAt, scheduleEnd,
      updatedBy: req.user?.id
    }
  });

  res.json(banner);
}

export async function deleteBanner(req, res) {
  const { id } = req.params;
  await CMSBanner.findByIdAndDelete(id);
  res.json({ success: true });
}

export async function reorderBanners(req, res) {
  const { banners } = req.body;

  for (let i = 0; i < banners.length; i++) {
    await CMSBanner.findByIdAndUpdate(banners[i], { $set: { order: i } });
  }

  res.json({ success: true });
}

// ============================================
// MEDIA LIBRARY
// ============================================

export async function getMedia(req, res) {
  const { type, folder, tags, search, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (type) filter.mediaType = type;
  if (folder) filter.folder = folder;
  if (tags) filter.tags = { $contains: tags.split(",") };
  if (search) {
    filter.$or = [
      { filename: { $ilike: `%${search}%` } },
      { alt: { $ilike: `%${search}%` } },
      { originalName: { $ilike: `%${search}%` } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const media = await CMSMedia.find(filter)
    .sort({ uploadedAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json({ data: media });
}

export async function getMediaById(req, res) {
  const { id } = req.params;
  const media = await CMSMedia.findById(id);
  if (!media) {
    return res.status(404).json({ error: "Media not found" });
  }
  res.json(media);
}

export async function uploadMedia(req, res) {
  const { filename, originalName, mediaType, url, size, mimeType, folder, tags, alt, metadata } = req.body;

  const media = await CMSMedia.create({
    filename: filename || `media_${uuidv4()}`,
    originalName: originalName || filename,
    mediaType: mediaType || "image",
    url: url || "",
    size: size || 0,
    mimeType: mimeType || "image/jpeg",
    folder: folder || "/",
    tags: tags || [],
    alt: alt || "",
    metadata: metadata || {},
    uploadedBy: req.user?.id
  });

  res.status(201).json(media);
}

export async function updateMedia(req, res) {
  const { id } = req.params;
  const { filename, folder, tags, alt, metadata } = req.body;

  const media = await CMSMedia.findByIdAndUpdate(id, {
    $set: { filename, folder, tags, alt, metadata }
  });

  res.json(media);
}

export async function deleteMedia(req, res) {
  const { id } = req.params;
  await CMSMedia.findByIdAndDelete(id);
  res.json({ success: true });
}

// ============================================
// TAXONOMIES (Categories & Tags)
// ============================================

export async function getTaxonomies(req, res) {
  const { type } = req.query;
  const filter = type ? { taxonomyType: type } : {};

  const taxonomies = await CMSTaxonomy.find(filter).sort({ order: 1 });

  res.json({ data: taxonomies });
}

export async function createTaxonomy(req, res) {
  const { name, slug, taxonomyType, description, parent, order } = req.body;

  const taxonomy = await CMSTaxonomy.create({
    name,
    slug,
    taxonomyType: taxonomyType || "category",
    description: description || "",
    parent: parent || null,
    order: order || 0,
    createdBy: req.user?.id
  });

  res.status(201).json(taxonomy);
}

export async function updateTaxonomy(req, res) {
  const { id } = req.params;
  const { name, slug, description, parent, order } = req.body;

  const taxonomy = await CMSTaxonomy.findByIdAndUpdate(id, {
    $set: { name, slug, description, parent, order }
  });

  res.json(taxonomy);
}

export async function deleteTaxonomy(req, res) {
  const { id } = req.params;
  await CMSTaxonomy.findByIdAndDelete(id);
  res.json({ success: true });
}

// ============================================
// REVISIONS
// ============================================

export async function getRevisions(req, res) {
  const { contentId, contentType } = req.query;

  const revisions = await CMSRevision.find({ contentId, contentType }).sort({ version: -1 });

  res.json({ data: revisions });
}

export async function getRevisionById(req, res) {
  const { id } = req.params;
  const revision = await CMSRevision.findById(id);
  if (!revision) {
    return res.status(404).json({ error: "Revision not found" });
  }
  res.json(revision);
}

// ============================================
// A/B TESTS
// ============================================

export async function getABTests(req, res) {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const tests = await CMSABTest.find(filter).sort({ createdAt: -1 });

  res.json({ data: tests });
}

export async function createABTest(req, res) {
  const { name, contentId, contentType, variants, metric, status } = req.body;

  const test = await CMSABTest.create({
    name,
    contentId,
    contentType,
    variants: variants || [],
    metric: metric || "conversion",
    status: status || "draft",
    results: { control: { views: 0, conversions: 0 }, variants: {} },
    createdBy: req.user?.id
  });

  res.status(201).json(test);
}

export async function updateABTest(req, res) {
  const { id } = req.params;
  const { status, results } = req.body;

  const test = await CMSABTest.findByIdAndUpdate(id, {
    $set: { status, results }
  });

  res.json(test);
}

export async function deleteABTest(req, res) {
  const { id } = req.params;
  await CMSABTest.findByIdAndDelete(id);
  res.json({ success: true });
}

// ============================================
// ANALYTICS
// ============================================

export async function trackAnalytics(req, res) {
  const { contentId, contentType, event, metadata } = req.body;

  const analytics = await CMSAnalytics.create({
    contentId,
    contentType,
    event,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
    userId: req.user?.id
  });

  res.status(201).json(analytics);
}

export async function getAnalytics(req, res) {
  const { contentId, contentType, startDate, endDate } = req.query;
  const filter = {};

  if (contentId) filter.contentId = contentId;
  if (contentType) filter.contentType = contentType;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = startDate;
    if (endDate) filter.timestamp.$lte = endDate;
  }

  const analytics = await CMSAnalytics.find(filter).sort({ timestamp: -1 }).limit(1000);

  res.json({ data: analytics });
}

export async function getContentAnalytics(req, res) {
  const { contentId } = req.params;

  const views = await CMSAnalytics.countDocuments({ contentId, event: "view" });
  const clicks = await CMSAnalytics.countDocuments({ contentId, event: "click" });
  const conversions = await CMSAnalytics.countDocuments({ contentId, event: "conversion" });

  const topSearchTerms = await CMSAnalytics.aggregate([
    { $match: { contentId, event: "search" } },
    { $group: { _id: "$metadata.term", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  res.json({
    views,
    clicks,
    conversions,
    bounceRate: views > 0 ? ((views - clicks) / views * 100).toFixed(2) : 0,
    topSearchTerms
  });
}

// ============================================
// PUBLISHING CALENDAR
// ============================================

export async function getPublishingCalendar(req, res) {
  const { startDate, endDate } = req.query;

  const scheduledPages = await CMSPage.find({
    scheduleAt: { $gte: startDate, $lte: endDate }
  });

  const scheduledContent = await CMSContent.find({
    scheduleAt: { $gte: startDate, $lte: endDate }
  });

  const scheduledCampaigns = await CMSCampaign.find({
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } }
    ]
  });

  const scheduledBanners = await CMSBanner.find({
    $or: [
      { scheduleAt: { $gte: startDate, $lte: endDate } },
      { scheduleEnd: { $gte: startDate, $lte: endDate } }
    ]
  });

  res.json({
    pages: scheduledPages,
    content: scheduledContent,
    campaigns: scheduledCampaigns,
    banners: scheduledBanners
  });
}

// ============================================
// SEARCH
// ============================================

export async function searchContent(req, res) {
  const { q, type, limit = 20 } = req.query;

  if (!q) {
    return res.json({ data: [] });
  }

  const searchTerm = `%${q}%`;
  const results = [];

  if (!type || type === "page") {
    const pages = await CMSPage.find({
      $or: [
        { title: { $ilike: searchTerm } },
        { slug: { $ilike: searchTerm } }
      ],
      status: "published"
    }).limit(parseInt(limit, 10));
    results.push(...pages.map(p => ({ ...p, resultType: "page" })));
  }

  if (!type || type === "content") {
    const contents = await CMSContent.find({
      $or: [
        { title: { $ilike: searchTerm } },
        { body: { $ilike: searchTerm } }
      ],
      status: "published"
    }).limit(parseInt(limit, 10));
    results.push(...contents.map(c => ({ ...c, resultType: "content" })));
  }

  if (!type || type === "faq") {
    const faqs = await CMSFaq.find({
      $or: [
        { question: { $ilike: searchTerm } },
        { answer: { $ilike: searchTerm } }
      ]
    }).limit(parseInt(limit, 10));
    results.push(...faqs.map(f => ({ ...f, resultType: "faq" })));
  }

  if (!type || type === "media") {
    const media = await CMSMedia.find({
      $or: [
        { filename: { $ilike: searchTerm } },
        { alt: { $ilike: searchTerm } }
      ]
    }).limit(parseInt(limit, 10));
    results.push(...media.map(m => ({ ...m, resultType: "media" })));
  }

  res.json({ data: results.slice(0, parseInt(limit)) });
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(req, res) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    totalPages,
    publishedPages,
    totalContent,
    publishedContent,
    totalMedia,
    totalFaqs,
    activeCampaigns,
    activeBanners
  ] = await Promise.all([
    CMSPage.countDocuments({}),
    CMSPage.countDocuments({ status: "published" }),
    CMSContent.countDocuments({}),
    CMSContent.countDocuments({ status: "published" }),
    CMSMedia.countDocuments({}),
    CMSFaq.countDocuments({}),
    CMSCampaign.countDocuments({ status: "active" }),
    CMSBanner.countDocuments({ status: "active" })
  ]);

  const recentAnalytics = await CMSAnalytics.aggregate([
    { $match: { timestamp: { $gte: weekAgo.toISOString() } } },
    { $group: { _id: "$event", count: { $sum: 1 } } }
  ]);

  const topContent = await CMSAnalytics.aggregate([
    { $match: { timestamp: { $gte: monthAgo.toISOString() }, event: "view" } },
    { $group: { _id: "$contentId", views: { $sum: 1 } } },
    { $sort: { views: -1 } },
    { $limit: 5 }
  ]);

  res.json({
    pages: { total: totalPages, published: publishedPages },
    content: { total: totalContent, published: publishedContent },
    media: { total: totalMedia },
    faqs: { total: totalFaqs },
    campaigns: { active: activeCampaigns },
    banners: { active: activeBanners },
    analytics: {
      weekViews: recentAnalytics.find(a => a._id === "view")?.count || 0,
      weekClicks: recentAnalytics.find(a => a._id === "click")?.count || 0,
      weekConversions: recentAnalytics.find(a => a._id === "conversion")?.count || 0
    },
    topContent
  });
}
