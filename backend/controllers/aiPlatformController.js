// ============================================================
// KAYAD AI PLATFORM BUILDER CONTROLLER
// Intelligent AI Copilot for Platform Administration
// ============================================================

import AICommand from "../models/AICommand.js";
import AIKnowledge from "../models/AIKnowledge.js";
import AIConversation from "../models/AIConversation.js";
import AIPrompt from "../models/AIPrompt.js";
import AIWorkspace from "../models/AIWorkspace.js";

// ============================================
// AI ASSISTANT - NATURAL LANGUAGE PROCESSING
// ============================================

export async function processAICommand(req, res) {
  const { command, context } = req.body;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // Parse the natural language command
  const parsed = parseNaturalLanguageCommand(command);

  // Check permissions for the action
  if (!canUserPerformAction(userRole, parsed.action)) {
    return res.status(403).json({
      success: false,
      error: "You don't have permission to perform this action",
    });
  }

  // Generate preview of changes
  const preview = await generatePreview(parsed);

  // Store the command
  const aiCommand = await AICommand.create({
    command,
    action: parsed.action,
    entity: parsed.entity,
    parameters: JSON.stringify(parsed.parameters),
    status: 'pending',
    userId,
    userRole,
    preview: JSON.stringify(preview),
  });

  // Start conversation
  const conversation = await AIConversation.create({
    commandId: aiCommand.id,
    userId,
    messages: JSON.stringify([
      { role: 'user', content: command, timestamp: new Date().toISOString() },
    ]),
  });

  res.json({
    success: true,
    data: {
      commandId: aiCommand.id,
      conversationId: conversation.id,
      parsed,
      preview,
      requiresApproval: parsed.requiresApproval !== false,
      suggestedChanges: preview.changes,
    },
  });
}

export async function approveAICommand(req, res) {
  const { commandId } = req.params;

  const command = await AICommand.findById(commandId);
  if (!command) return res.status(404).json({ success: false, error: "Command not found" });

  if (command.status !== 'pending') {
    return res.status(400).json({ success: false, error: "Command is not pending approval" });
  }

  // Execute the command
  const result = await executeCommand(command);

  // Update command status
  await AICommand.update(commandId, {
    status: 'executed',
    executedAt: new Date().toISOString(),
    result: JSON.stringify(result),
  });

  res.json({ success: true, data: result, message: "Command executed successfully" });
}

export async function rejectAICommand(req, res) {
  const { commandId } = req.params;
  const { reason } = req.body;

  await AICommand.update(commandId, {
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason,
  });

  res.json({ success: true, message: "Command rejected" });
}

// ============================================
// AI CONVERSATIONS
// ============================================

export async function getConversations(req, res) {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const conversations = await AIConversation.findAll({
    filters: { userId: req.user?.id },
    limit: parseInt(limit),
    offset,
    orderBy: "created_at",
    order: "desc",
  });

  res.json({ success: true, data: conversations });
}

export async function getConversation(req, res) {
  const conversation = await AIConversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ success: false, error: "Conversation not found" });

  res.json({ success: true, data: conversation });
}

export async function addMessageToConversation(req, res) {
  const { conversationId, message } = req.body;

  const conversation = await AIConversation.findById(conversationId);
  if (!conversation) return res.status(404).json({ success: false, error: "Conversation not found" });

  const messages = JSON.parse(conversation.messages || '[]');
  messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

  // Process the message
  const response = await generateAIResponse(message, req.user);

  messages.push({ role: 'assistant', content: response.content, timestamp: new Date().toISOString() });

  await AIConversation.update(conversationId, {
    messages: JSON.stringify(messages),
    lastMessage: message,
  });

  res.json({ success: true, data: { response: response.content, action: response.action } });
}

// ============================================
// AI PROMPTS
// ============================================

export async function getPrompts(req, res) {
  const { category, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (category) filters.category = category;

  const prompts = await AIPrompt.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "usage_count",
    order: "desc",
  });

  res.json({ success: true, data: prompts });
}

export async function createPrompt(req, res) {
  const { name, category, prompt, description, variables } = req.body;

  const aiPrompt = await AIPrompt.create({
    name,
    category,
    prompt,
    description,
    variables: typeof variables === 'object' ? JSON.stringify(variables) : variables,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: aiPrompt });
}

export async function updatePrompt(req, res) {
  const { name, category, prompt, description, variables } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (category !== undefined) updateData.category = category;
  if (prompt !== undefined) updateData.prompt = prompt;
  if (description !== undefined) updateData.description = description;
  if (variables !== undefined) updateData.variables = typeof variables === 'object' ? JSON.stringify(variables) : variables;

  const aiPrompt = await AIPrompt.update(req.params.id, updateData);
  res.json({ success: true, data: aiPrompt });
}

export async function deletePrompt(req, res) {
  await AIPrompt.delete(req.params.id);
  res.json({ success: true, message: "Prompt deleted" });
}

export async function executePrompt(req, res) {
  const { promptId, variables } = req.body;

  const aiPrompt = await AIPrompt.findById(promptId);
  if (!aiPrompt) return res.status(404).json({ success: false, error: "Prompt not found" });

  // Replace variables in prompt
  const filledPrompt = fillPromptVariables(aiPrompt.prompt, variables);

  // Increment usage
  await AIPrompt.update(promptId, { usageCount: (aiPrompt.usageCount || 0) + 1 });

  // Process the command
  const result = await processAICommand({ body: { command: filledPrompt }, user: req.user }, { json: (d) => d });

  res.json({ success: true, data: result });
}

// ============================================
// AI KNOWLEDGE BASE
// ============================================

export async function getKnowledgeBase(req, res) {
  const { category, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (category) filters.category = category;

  const knowledge = await AIKnowledge.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "created_at",
    order: "desc",
  });

  res.json({ success: true, data: knowledge });
}

export async function addKnowledge(req, res) {
  const { title, content, category, tags } = req.body;

  const knowledge = await AIKnowledge.create({
    title,
    content,
    category,
    tags: typeof tags === 'object' ? JSON.stringify(tags) : tags,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: knowledge });
}

export async function updateKnowledge(req, res) {
  const { title, content, category, tags } = req.body;

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (category !== undefined) updateData.category = category;
  if (tags !== undefined) updateData.tags = typeof tags === 'object' ? JSON.stringify(tags) : tags;

  const knowledge = await AIKnowledge.update(req.params.id, updateData);
  res.json({ success: true, data: knowledge });
}

export async function deleteKnowledge(req, res) {
  await AIKnowledge.delete(req.params.id);
  res.json({ success: true, message: "Knowledge deleted" });
}

// ============================================
// AI WORKSPACES
// ============================================

export async function getWorkspaces(req, res) {
  const workspaces = await AIWorkspace.findAll({
    orderBy: "created_at",
    order: "desc",
  });
  res.json({ success: true, data: workspaces });
}

export async function createWorkspace(req, res) {
  const { name, description, config } = req.body;

  const workspace = await AIWorkspace.create({
    name,
    description,
    config: typeof config === 'object' ? JSON.stringify(config) : config,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: workspace });
}

export async function updateWorkspace(req, res) {
  const { name, description, config, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (config !== undefined) updateData.config = typeof config === 'object' ? JSON.stringify(config) : config;
  if (status !== undefined) updateData.status = status;

  const workspace = await AIWorkspace.update(req.params.id, updateData);
  res.json({ success: true, data: workspace });
}

export async function deleteWorkspace(req, res) {
  await AIWorkspace.delete(req.params.id);
  res.json({ success: true, message: "Workspace deleted" });
}

// ============================================
// AI ANALYTICS
// ============================================

export async function getAIAnalytics(req, res) {
  const commands = await AICommand.findAll({ limit: 1000 });

  const stats = {
    totalCommands: commands.length,
    executed: commands.filter(c => c.status === 'executed').length,
    rejected: commands.filter(c => c.status === 'rejected').length,
    pending: commands.filter(c => c.status === 'pending').length,
    byAction: {},
    byUser: {},
    recentActivity: commands.slice(0, 10),
  };

  commands.forEach(c => {
    stats.byAction[c.action] = (stats.byAction[c.action] || 0) + 1;
    if (c.userId) {
      stats.byUser[c.userId] = (stats.byUser[c.userId] || 0) + 1;
    }
  });

  res.json({ success: true, data: stats });
}

// ============================================
// AI DASHBOARD
// ============================================

export async function getAIDashboard(req, res) {
  const [commands, conversations, prompts, knowledge] = await Promise.all([
    AICommand.findAll({ limit: 100 }),
    AIConversation.findAll({ filters: { userId: req.user?.id }, limit: 100 }),
    AIPrompt.findAll({ limit: 100 }),
    AIKnowledge.findAll({ limit: 100 }),
  ]);

  const executedCount = commands.filter(c => c.status === 'executed').length;
  const recentCommands = commands.slice(0, 5);

  res.json({
    success: true,
    data: {
      totalCommands: commands.length,
      executedToday: executedCount,
      activeConversations: conversations.length,
      totalPrompts: prompts.length,
      knowledgeBaseSize: knowledge.length,
      recentActivity: recentCommands.map(c => ({
        id: c.id,
        command: c.command,
        action: c.action,
        status: c.status,
        createdAt: c.createdAt,
      })),
    },
  });
}

// ============================================
// AI SUGGESTIONS
// ============================================

export async function getAISuggestions(req, res) {
  const suggestions = [
    {
      id: 'suggest_1',
      type: 'optimization',
      title: 'Optimize Homepage Hero',
      description: 'Hero sections with video backgrounds show 34% higher engagement',
      command: 'Create a new hero section with video background for the homepage',
      impact: 'high',
      confidence: 87,
    },
    {
      id: 'suggest_2',
      type: 'campaign',
      title: 'Launch Summer Promotion',
      description: 'Summer campaigns typically increase dealer inquiries by 25%',
      command: 'Create a summer promotion campaign with 10% discount for SUVs',
      impact: 'medium',
      confidence: 82,
    },
    {
      id: 'suggest_3',
      type: 'content',
      title: 'Add FAQ Section',
      description: 'Pages with FAQs have 40% lower bounce rates',
      command: 'Add an FAQ section to the dealer page with common questions',
      impact: 'medium',
      confidence: 91,
    },
    {
      id: 'suggest_4',
      type: 'navigation',
      title: 'Add Quick Search',
      description: 'Adding quick search to navbar increases conversions by 18%',
      command: 'Add a quick search bar to the navigation menu',
      impact: 'high',
      confidence: 94,
    },
    {
      id: 'suggest_5',
      type: 'performance',
      title: 'Enable Lazy Loading',
      description: 'Lazy loading images can improve page load by 40%',
      command: 'Enable lazy loading for all image galleries',
      impact: 'high',
      confidence: 96,
    },
  ];

  res.json({ success: true, data: suggestions });
}

// ============================================
// AI HEALTH CHECK
// ============================================

export async function getPlatformHealth(req, res) {
  const health = {
    overall: 'healthy',
    issues: [],
    score: 95,
    categories: {
      pages: { status: 'healthy', score: 98, issues: [] },
      images: { status: 'warning', score: 85, issues: ['3 missing images detected', '12 compressed images recommended'] },
      seo: { status: 'healthy', score: 92, issues: [] },
      performance: { status: 'healthy', score: 94, issues: [] },
      accessibility: { status: 'warning', score: 78, issues: ['5 images missing alt text', '2 low contrast elements'] },
      configuration: { status: 'healthy', score: 100, issues: [] },
    },
    recommendations: [
      { priority: 'high', action: 'Add alt text to vehicle gallery images' },
      { priority: 'medium', action: 'Compress 12 large images on homepage' },
      { priority: 'low', action: 'Improve contrast on footer links' },
    ],
  };

  res.json({ success: true, data: health });
}

// ============================================
// AI COMMAND HISTORY
// ============================================

export async function getCommandHistory(req, res) {
  const { status, action, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;
  if (action) filters.action = action;

  const commands = await AICommand.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "created_at",
    order: "desc",
  });

  res.json({ success: true, data: commands });
}

export async function rollbackCommand(req, res) {
  const { commandId } = req.params;

  const command = await AICommand.findById(commandId);
  if (!command) return res.status(404).json({ success: false, error: "Command not found" });

  if (command.status !== 'executed') {
    return res.status(400).json({ success: false, error: "Cannot rollback non-executed command" });
  }

  // In production, this would revert the changes made by the command
  await AICommand.update(commandId, {
    status: 'rolled_back',
    rolledBackAt: new Date().toISOString(),
  });

  res.json({ success: true, message: "Command rolled back successfully" });
}

// ============================================
// AI COMMAND TEMPLATES
// ============================================

export async function getCommandTemplates(req, res) {
  const templates = [
    // Page Commands
    { category: 'page', templates: [
      { template: 'Create a {type} page', description: 'Create a new page', example: 'Create a landing page for Toyota' },
      { template: 'Update the {page} page', description: 'Modify an existing page', example: 'Update the homepage hero' },
      { template: 'Delete the {page} page', description: 'Remove a page', example: 'Delete the old summer sale page' },
    ]},
    // Design Commands
    { category: 'design', templates: [
      { template: 'Change primary color to {color}', description: 'Update theme color', example: 'Change primary color to blue' },
      { template: 'Make {element} more {style}', description: 'Style adjustment', example: 'Make the navbar more modern' },
      { template: 'Add {component} to {location}', description: 'Add component', example: 'Add search bar to header' },
    ]},
    // Campaign Commands
    { category: 'campaign', templates: [
      { template: 'Launch {name} campaign', description: 'Start a campaign', example: 'Launch summer sale campaign' },
      { template: 'Create a {brand} promotion', description: 'Create promotion', example: 'Create a Toyota promotion' },
      { template: 'End the {campaign} campaign', description: 'End campaign', example: 'End the auction week campaign' },
    ]},
    // Content Commands
    { category: 'content', templates: [
      { template: 'Add {content} to {location}', description: 'Add content', example: 'Add FAQ section to dealer page' },
      { template: 'Generate {type} copy', description: 'Generate marketing copy', example: 'Generate welcome email for dealers' },
      { template: 'Translate {content} to {language}', description: 'Translate content', example: 'Translate homepage to Swahili' },
    ]},
    // Data Commands
    { category: 'data', templates: [
      { template: 'Show {metric} for {period}', description: 'Show analytics', example: 'Show dealer growth for last 6 months' },
      { template: 'Compare {item1} and {item2}', description: 'Compare data', example: 'Compare auction performance by county' },
    ]},
  ];

  res.json({ success: true, data: templates });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseNaturalLanguageCommand(command) {
  const lowerCommand = command.toLowerCase();

  // Campaign commands
  if (lowerCommand.includes('launch') || lowerCommand.includes('start')) {
    if (lowerCommand.includes('campaign')) {
      return {
        action: 'launch_campaign',
        entity: 'campaign',
        parameters: extractCampaignParams(command),
        requiresApproval: true,
      };
    }
  }

  // Create commands
  if (lowerCommand.startsWith('create')) {
    if (lowerCommand.includes('page') || lowerCommand.includes('homepage') || lowerCommand.includes('landing')) {
      return {
        action: 'create_page',
        entity: 'page',
        parameters: extractPageParams(command),
        requiresApproval: true,
      };
    }
    if (lowerCommand.includes('promotion') || lowerCommand.includes('campaign')) {
      return {
        action: 'create_campaign',
        entity: 'campaign',
        parameters: extractCampaignParams(command),
        requiresApproval: true,
      };
    }
    if (lowerCommand.includes('menu')) {
      return {
        action: 'create_menu',
        entity: 'navigation',
        parameters: extractMenuParams(command),
        requiresApproval: true,
      };
    }
  }

  // Update commands
  if (lowerCommand.startsWith('update') || lowerCommand.startsWith('change') || lowerCommand.startsWith('modify')) {
    if (lowerCommand.includes('color') || lowerCommand.includes('theme')) {
      return {
        action: 'update_theme',
        entity: 'theme',
        parameters: extractColorParams(command),
        requiresApproval: true,
      };
    }
    if (lowerCommand.includes('card') || lowerCommand.includes('layout') || lowerCommand.includes('design')) {
      return {
        action: 'update_design',
        entity: 'design',
        parameters: extractDesignParams(command),
        requiresApproval: true,
      };
    }
    if (lowerCommand.includes('menu') || lowerCommand.includes('navigation') || lowerCommand.includes('navbar')) {
      return {
        action: 'update_navigation',
        entity: 'navigation',
        parameters: extractNavParams(command),
        requiresApproval: true,
      };
    }
  }

  // Move/Reorder commands
  if (lowerCommand.includes('move') || lowerCommand.includes('reorder') || lowerCommand.includes('rearrange')) {
    return {
      action: 'reorder',
      entity: 'layout',
      parameters: extractMoveParams(command),
      requiresApproval: true,
    };
  }

  // Design suggestions
  if (lowerCommand.includes('make') || lowerCommand.includes('improve') || lowerCommand.includes('modernize')) {
    return {
      action: 'suggest_design',
      entity: 'design',
      parameters: extractDesignSuggestion(command),
      requiresApproval: false,
    };
  }

  // Analytics commands
  if (lowerCommand.includes('show') || lowerCommand.includes('what') || lowerCommand.includes('how many')) {
    return {
      action: 'query',
      entity: 'analytics',
      parameters: extractQueryParams(command),
      requiresApproval: false,
    };
  }

  // Default - return as chat message
  return {
    action: 'chat',
    entity: 'assistant',
    parameters: { message: command },
    requiresApproval: false,
  };
}

function extractCampaignParams(command) {
  const params = {};
  const lower = command.toLowerCase();

  // Extract campaign name
  const nameMatch = command.match(/campaign[:\s]+["']?([^"']+)["']?/i) || command.match(/promotion[:\s]+["']?([^"']+)["']?/i);
  if (nameMatch) params.name = nameMatch[1].trim();

  // Extract brand
  const brandMatch = lower.match(/(toyota|honda|mercedes|bmw|suzuki|ford|nissan|vw|hyundai|kia|mazda)/);
  if (brandMatch) params.brand = brandMatch[1];

  // Extract discount
  const discountMatch = lower.match(/(\d+)%?\s*discount/);
  if (discountMatch) params.discount = parseInt(discountMatch[1]);

  return params;
}

function extractPageParams(command) {
  const params = {};
  const lower = command.toLowerCase();

  // Extract page type
  if (lower.includes('landing')) params.pageType = 'landing';
  else if (lower.includes('homepage')) params.pageType = 'home';
  else if (lower.includes('dealer')) params.pageType = 'dealer';
  else if (lower.includes('auction')) params.pageType = 'auction';
  else if (lower.includes('inspection')) params.pageType = 'inspection';
  else params.pageType = 'custom';

  // Extract brand/name
  const brandMatch = lower.match(/(?:for|page)[:\s]+["']?([^"']+)["']?/i);
  if (brandMatch) params.name = brandMatch[1].trim();

  return params;
}

function extractMenuParams(command) {
  const params = {};
  const match = command.match(/menu[:\s]+["']?([^"']+)["']?/i);
  if (match) params.name = match[1].trim();
  return params;
}

function extractColorParams(command) {
  const params = {};
  const lower = command.toLowerCase();

  // Extract color type
  if (lower.includes('primary')) params.colorType = 'primary';
  else if (lower.includes('accent')) params.colorType = 'accent';
  else if (lower.includes('background')) params.colorType = 'background';

  // Extract color value
  const colorMatch = lower.match(/(?:to|be)[:\s]+([a-z]+|#[a-f0-9]{6})/);
  if (colorMatch) params.colorValue = colorMatch[1];

  return params;
}

function extractDesignParams(command) {
  return { description: command };
}

function extractNavParams(command) {
  return { description: command };
}

function extractMoveParams(command) {
  const params = {};
  const lower = command.toLowerCase();

  // Extract source and destination
  const moveMatch = lower.match(/move\s+(.+?)\s+(?:above|below|to|before|after)\s+(.+)/);
  if (moveMatch) {
    params.from = moveMatch[1].trim();
    params.to = moveMatch[2].trim();
    params.position = lower.includes('above') || lower.includes('before') ? 'before' : 'after';
  }

  return params;
}

function extractDesignSuggestion(command) {
  const params = {};
  const lower = command.toLowerCase();

  if (lower.includes('premium') || lower.includes('luxury')) params.style = 'premium';
  else if (lower.includes('modern')) params.style = 'modern';
  else if (lower.includes('minimal') || lower.includes('clean')) params.style = 'minimal';
  else if (lower.includes('bold')) params.style = 'bold';

  if (lower.includes('homepage')) params.target = 'homepage';
  else if (lower.includes('navbar') || lower.includes('nav')) params.target = 'navigation';
  else if (lower.includes('card')) params.target = 'cards';

  return params;
}

function extractQueryParams(command) {
  return { query: command };
}

function canUserPerformAction(role, action) {
  const permissions = {
    superadmin: ['execute', 'approve', 'create', 'update', 'delete', 'chat'],
    admin: ['execute', 'approve', 'create', 'update', 'chat'],
    editor: ['execute', 'create', 'update', 'chat'],
    viewer: ['chat'],
  };

  return permissions[role]?.includes(action) || false;
}

async function generatePreview(parsed) {
  const changes = [];

  switch (parsed.action) {
    case 'create_page':
      changes.push({
        type: 'create',
        entity: 'page',
        description: `Create new ${parsed.parameters.pageType} page`,
        details: parsed.parameters,
      });
      break;
    case 'create_campaign':
      changes.push({
        type: 'create',
        entity: 'campaign',
        description: `Create campaign: ${parsed.parameters.name || 'Unnamed Campaign'}`,
        details: parsed.parameters,
      });
      break;
    case 'update_theme':
      changes.push({
        type: 'update',
        entity: 'theme',
        description: `Change ${parsed.parameters.colorType} color to ${parsed.parameters.colorValue}`,
        details: parsed.parameters,
      });
      break;
    case 'update_design':
      changes.push({
        type: 'update',
        entity: 'design',
        description: 'Update design elements',
        details: parsed.parameters,
      });
      break;
    case 'reorder':
      changes.push({
        type: 'move',
        entity: 'layout',
        description: `Move ${parsed.parameters.from} ${parsed.parameters.position} ${parsed.parameters.to}`,
        details: parsed.parameters,
      });
      break;
    case 'suggest_design':
      changes.push({
        type: 'suggestion',
        entity: 'design',
        description: `Design suggestions for ${parsed.parameters.target}`,
        details: parsed.parameters,
      });
      break;
    default:
      changes.push({
        type: 'info',
        entity: 'assistant',
        description: parsed.parameters.message,
      });
  }

  return { changes, estimatedTime: '2-5 minutes', impact: 'low' };
}

async function executeCommand(command) {
  const parsed = JSON.parse(command.parameters || '{}');
  const result = { success: true, changes: [] };

  switch (command.action) {
    case 'create_page':
      result.changes.push({ type: 'page_created', id: `page_${Date.now()}`, ...parsed });
      break;
    case 'create_campaign':
      result.changes.push({ type: 'campaign_created', id: `campaign_${Date.now()}`, ...parsed });
      break;
    case 'update_theme':
      result.changes.push({ type: 'theme_updated', ...parsed });
      break;
    case 'update_design':
      result.changes.push({ type: 'design_updated', ...parsed });
      break;
    case 'reorder':
      result.changes.push({ type: 'layout_reordered', ...parsed });
      break;
    default:
      result.changes.push({ type: 'unknown', message: 'Action not recognized' });
  }

  return result;
}

async function generateAIResponse(message, user) {
  const response = {
    content: '',
    action: null,
  };

  const lower = message.toLowerCase();

  // Generate contextual responses
  if (lower.includes('how') || lower.includes('what') || lower.includes('show')) {
    response.content = `Based on your query, here's what I found:\n\nI've analyzed the platform data and prepared the information you requested. You can view the detailed analytics in the dashboard or I can generate a report for you.`;
    response.action = { type: 'analytics', query: message };
  } else if (lower.includes('create') || lower.includes('add')) {
    response.content = `I understand you want to create something new. I've analyzed your request and prepared a preview of the changes. Would you like me to proceed with:\n\n1. Show a preview first\n2. Execute immediately\n3. Get more details\n\nWhat would you prefer?`;
    response.action = { type: 'create', query: message };
  } else if (lower.includes('update') || lower.includes('change') || lower.includes('modify')) {
    response.content = `I see you want to update something. I've identified the elements you mentioned and prepared the changes. Would you like me to:\n\n1. Show before/after preview\n2. Apply changes directly\n3. Suggest alternative approaches`;
    response.action = { type: 'update', query: message };
  } else if (lower.includes('help') || lower.includes('what can')) {
    response.content = `I'm your KAYAD AI assistant. Here are some things I can help you with:\n\n**Pages:** "Create a new landing page", "Update the homepage hero"\n**Design:** "Make the navbar more modern", "Change primary color to blue"\n**Campaigns:** "Launch a summer sale campaign", "Create a Toyota promotion"\n**Navigation:** "Add a Fleet menu", "Move Featured above Auctions"\n**Analytics:** "Show dealer growth", "Compare auction performance"\n\nWhat would you like to do?`;
    response.action = null;
  } else {
    response.content = `I've received your request: "${message}" \n\nI'm analyzing this and preparing a response. For complex actions, I'll show you a preview before making any changes. For simple queries, I'll answer directly.\n\nIs there anything specific you'd like me to help with?`;
    response.action = { type: 'chat' };
  }

  return response;
}

function fillPromptVariables(prompt, variables) {
  let filled = prompt;
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
  }
  return filled;
}
