// ============================================================
// KAYAD WORKFLOW AUTOMATION CONTROLLER
// Visual workflow builder, business rules, approvals, tasks
// ============================================================

import Workflow from "../models/Workflow.js";
import WorkflowTrigger from "../models/WorkflowTrigger.js";
import WorkflowAction from "../models/WorkflowAction.js";
import WorkflowLog from "../models/WorkflowLog.js";
import AutomationTask from "../models/AutomationTask.js";
import BusinessRule from "../models/BusinessRule.js";
import ApprovalChain from "../models/ApprovalChain.js";
import NotificationTemplate from "../models/NotificationTemplate.js";
import ScheduledJob from "../models/ScheduledJob.js";

// ============================================
// WORKFLOWS
// ============================================

export async function getWorkflows(req, res) {
  const { status, category, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;
  if (category) filters.category = category;

  const workflows = await Workflow.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "updated_at",
    order: "desc",
  });

  const total = await Workflow.count(filters);

  res.json({
    success: true,
    data: workflows,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
  });
}

export async function getWorkflowById(req, res) {
  const workflow = await Workflow.findById(req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: "Workflow not found" });

  // Get triggers
  const triggers = await WorkflowTrigger.findAll({
    filters: { workflowId: req.params.id },
  });

  // Get actions
  const actions = await WorkflowAction.findAll({
    filters: { workflowId: req.params.id },
  });

  // Get recent logs
  const logs = await WorkflowLog.findAll({
    filters: { workflowId: req.params.id },
    limit: 10,
    orderBy: "created_at",
    order: "desc",
  });

  res.json({
    success: true,
    data: { ...workflow, triggers, actions, recentLogs: logs },
  });
}

export async function createWorkflow(req, res) {
  const { name, description, category, nodes, edges, status = "draft", settings } = req.body;

  const workflow = await Workflow.create({
    name,
    description,
    category,
    nodes: JSON.stringify(nodes || []),
    edges: JSON.stringify(edges || []),
    status,
    settings: JSON.stringify(settings || {}),
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: workflow });
}

export async function updateWorkflow(req, res) {
  const { name, description, category, nodes, edges, status, settings } = req.body;

  const existing = await Workflow.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Workflow not found" });

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (nodes !== undefined) updateData.nodes = JSON.stringify(nodes);
  if (edges !== undefined) updateData.edges = JSON.stringify(edges);
  if (status !== undefined) updateData.status = status;
  if (settings !== undefined) updateData.settings = JSON.stringify(settings);

  const workflow = await Workflow.update(req.params.id, updateData);
  res.json({ success: true, data: workflow });
}

export async function deleteWorkflow(req, res) {
  const existing = await Workflow.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Workflow not found" });

  // Delete related triggers, actions, and logs
  await WorkflowTrigger.deleteAll({ workflowId: req.params.id });
  await WorkflowAction.deleteAll({ workflowId: req.params.id });
  await WorkflowLog.deleteAll({ workflowId: req.params.id });

  await Workflow.delete(req.params.id);
  res.json({ success: true, message: "Workflow deleted" });
}

export async function publishWorkflow(req, res) {
  const workflow = await Workflow.findById(req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: "Workflow not found" });

  await Workflow.update(req.params.id, { status: "active" });
  await logWorkflowExecution(req.params.id, "published", req.user?.id, null, "Workflow published");

  res.json({ success: true, message: "Workflow published" });
}

export async function pauseWorkflow(req, res) {
  const workflow = await Workflow.findById(req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: "Workflow not found" });

  await Workflow.update(req.params.id, { status: "paused" });
  await logWorkflowExecution(req.params.id, "paused", req.user?.id, null, "Workflow paused");

  res.json({ success: true, message: "Workflow paused" });
}

export async function simulateWorkflow(req, res) {
  const workflow = await Workflow.findById(req.params.id);
  if (!workflow) return res.status(404).json({ success: false, error: "Workflow not found" });

  const nodes = JSON.parse(workflow.nodes || "[]");
  const edges = JSON.parse(workflow.edges || "[]");
  const { context = {} } = req.body;

  // Simulate execution path
  const simulation = simulateExecutionPath(nodes, edges, context);

  res.json({
    success: true,
    data: {
      executionPath: simulation.path,
      warnings: simulation.warnings,
      estimatedDuration: simulation.duration,
      possibleOutcomes: simulation.outcomes,
    },
  });
}

// ============================================
// BUSINESS RULES
// ============================================

export async function getBusinessRules(req, res) {
  const { status, category, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;
  if (category) filters.category = category;

  const rules = await BusinessRule.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "updated_at",
    order: "desc",
  });

  res.json({ success: true, data: rules });
}

export async function getBusinessRuleById(req, res) {
  const rule = await BusinessRule.findById(req.params.id);
  if (!rule) return res.status(404).json({ success: false, error: "Rule not found" });
  res.json({ success: true, data: rule });
}

export async function createBusinessRule(req, res) {
  const { name, description, category, conditions, actions, priority = 0, status = "active" } = req.body;

  const rule = await BusinessRule.create({
    name,
    description,
    category,
    conditions: JSON.stringify(conditions || []),
    actions: JSON.stringify(actions || []),
    priority,
    status,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: rule });
}

export async function updateBusinessRule(req, res) {
  const { name, description, category, conditions, actions, priority, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (conditions !== undefined) updateData.conditions = JSON.stringify(conditions);
  if (actions !== undefined) updateData.actions = JSON.stringify(actions);
  if (priority !== undefined) updateData.priority = priority;
  if (status !== undefined) updateData.status = status;

  const rule = await BusinessRule.update(req.params.id, updateData);
  res.json({ success: true, data: rule });
}

export async function deleteBusinessRule(req, res) {
  await BusinessRule.delete(req.params.id);
  res.json({ success: true, message: "Rule deleted" });
}

export async function evaluateRules(req, res) {
  const { event, context } = req.body;

  // Get active rules for this event type
  const rules = await BusinessRule.findAll({
    filters: { status: "active", triggerEvent: event },
    orderBy: "priority",
    order: "desc",
  });

  const results = [];
  for (const rule of rules) {
    const conditions = JSON.parse(rule.conditions || "[]");
    if (evaluateConditions(conditions, context)) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        actions: JSON.parse(rule.actions || "[]"),
      });
    }
  }

  res.json({ success: true, data: results });
}

// ============================================
// APPROVAL CHAINS
// ============================================

export async function getApprovalChains(req, res) {
  const chains = await ApprovalChain.findAll({
    orderBy: "created_at",
    order: "desc",
  });
  res.json({ success: true, data: chains });
}

export async function getApprovalChainById(req, res) {
  const chain = await ApprovalChain.findById(req.params.id);
  if (!chain) return res.status(404).json({ success: false, error: "Approval chain not found" });
  res.json({ success: true, data: chain });
}

export async function createApprovalChain(req, res) {
  const { name, type, steps, escalationPolicy, autoApprove } = req.body;

  const chain = await ApprovalChain.create({
    name,
    type,
    steps: JSON.stringify(steps || []),
    escalationPolicy: JSON.stringify(escalationPolicy || {}),
    autoApprove: autoApprove || false,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: chain });
}

export async function updateApprovalChain(req, res) {
  const { name, steps, escalationPolicy, autoApprove, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (steps !== undefined) updateData.steps = JSON.stringify(steps);
  if (escalationPolicy !== undefined) updateData.escalationPolicy = JSON.stringify(escalationPolicy);
  if (autoApprove !== undefined) updateData.autoApprove = autoApprove;
  if (status !== undefined) updateData.status = status;

  const chain = await ApprovalChain.update(req.params.id, updateData);
  res.json({ success: true, data: chain });
}

export async function deleteApprovalChain(req, res) {
  await ApprovalChain.delete(req.params.id);
  res.json({ success: true, message: "Approval chain deleted" });
}

export async function initiateApproval(req, res) {
  const { chainId, entityType, entityId, context } = req.body;

  const chain = await ApprovalChain.findById(chainId);
  if (!chain) return res.status(404).json({ success: false, error: "Approval chain not found" });

  const steps = JSON.parse(chain.steps || "[]");
  const firstStep = steps[0];

  // Create task for first approver
  const task = await AutomationTask.create({
    title: `Approval: ${chain.name}`,
    description: `Please review and approve ${entityType} (ID: ${entityId})`,
    type: "approval",
    status: "pending",
    priority: firstStep.priority || "medium",
    assignedTo: firstStep.approverRole || firstStep.approverId,
    relatedEntityType: entityType,
    relatedEntityId: entityId,
    context: JSON.stringify(context || {}),
    dueAt: calculateDueDate(firstStep.timeout),
    metadata: JSON.stringify({ chainId, currentStep: 0, totalSteps: steps.length }),
  });

  res.status(201).json({ success: true, data: task });
}

// ============================================
// AUTOMATION TASKS
// ============================================

export async function getTasks(req, res) {
  const { status, priority, assignedTo, type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (assignedTo) filters.assignedTo = assignedTo;
  if (type) filters.type = type;

  const tasks = await AutomationTask.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "created_at",
    order: "desc",
  });

  res.json({ success: true, data: tasks });
}

export async function getTaskById(req, res) {
  const task = await AutomationTask.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: "Task not found" });
  res.json({ success: true, data: task });
}

export async function createTask(req, res) {
  const { title, description, type, priority, assignedTo, relatedEntityType, relatedEntityId, context, dueAt } = req.body;

  const task = await AutomationTask.create({
    title,
    description,
    type: type || "general",
    status: "pending",
    priority: priority || "medium",
    assignedTo,
    relatedEntityType,
    relatedEntityId,
    context: JSON.stringify(context || {}),
    dueAt,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: task });
}

export async function updateTask(req, res) {
  const { status, priority, assignedTo, dueAt, notes } = req.body;

  const updateData = {};
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
  if (dueAt !== undefined) updateData.dueAt = dueAt;
  if (notes !== undefined) updateData.notes = notes;

  const task = await AutomationTask.update(req.params.id, updateData);
  res.json({ success: true, data: task });
}

export async function completeTask(req, res) {
  const { action, comments } = req.body;

  const task = await AutomationTask.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: "Task not found" });

  await AutomationTask.update(req.params.id, {
    status: "completed",
    completedAt: new Date().toISOString(),
    completedBy: req.user?.id,
    notes: comments || task.notes,
    resolution: action,
  });

  res.json({ success: true, message: "Task completed" });
}

export async function escalateTask(req, res) {
  const { reason, escalateTo } = req.body;

  const task = await AutomationTask.findById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: "Task not found" });

  await AutomationTask.update(req.params.id, {
    status: "escalated",
    escalatedAt: new Date().toISOString(),
    escalatedBy: req.user?.id,
    notes: `${task.notes || ""}\n[ESCALATED] ${reason}`,
  });

  // Create new task for escalator
  if (escalateTo) {
    await AutomationTask.create({
      title: `[ESCALATED] ${task.title}`,
      description: task.description,
      type: task.type,
      status: "pending",
      priority: "high",
      assignedTo: escalateTo,
      relatedEntityType: task.relatedEntityType,
      relatedEntityId: task.relatedEntityId,
      context: task.context,
      metadata: JSON.stringify({ originalTaskId: task.id, reason }),
    });
  }

  res.json({ success: true, message: "Task escalated" });
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

export async function getNotificationTemplates(req, res) {
  const { type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (type) filters.type = type;

  const templates = await NotificationTemplate.findAll({
    filters,
    limit: parseInt(limit),
    offset,
  });

  res.json({ success: true, data: templates });
}

export async function getNotificationTemplateById(req, res) {
  const template = await NotificationTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ success: false, error: "Template not found" });
  res.json({ success: true, data: template });
}

export async function createNotificationTemplate(req, res) {
  const { name, type, subject, body, channels, variables, status } = req.body;

  const template = await NotificationTemplate.create({
    name,
    type,
    subject,
    body,
    channels: JSON.stringify(channels || ["email"]),
    variables: JSON.stringify(variables || []),
    status: status || "active",
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: template });
}

export async function updateNotificationTemplate(req, res) {
  const { name, subject, body, channels, variables, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (subject !== undefined) updateData.subject = subject;
  if (body !== undefined) updateData.body = body;
  if (channels !== undefined) updateData.channels = JSON.stringify(channels);
  if (variables !== undefined) updateData.variables = JSON.stringify(variables);
  if (status !== undefined) updateData.status = status;

  const template = await NotificationTemplate.update(req.params.id, updateData);
  res.json({ success: true, data: template });
}

export async function deleteNotificationTemplate(req, res) {
  await NotificationTemplate.delete(req.params.id);
  res.json({ success: true, message: "Template deleted" });
}

export async function previewNotification(req, res) {
  const { templateId, variables } = req.body;

  const template = await NotificationTemplate.findById(templateId);
  if (!template) return res.status(404).json({ success: false, error: "Template not found" });

  const preview = {
    subject: replaceVariables(template.subject, variables),
    body: replaceVariables(template.body, variables),
  };

  res.json({ success: true, data: preview });
}

// ============================================
// SCHEDULED JOBS
// ============================================

export async function getScheduledJobs(req, res) {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;

  const jobs = await ScheduledJob.findAll({
    filters,
    limit: parseInt(limit),
    offset,
  });

  res.json({ success: true, data: jobs });
}

export async function createScheduledJob(req, res) {
  const { name, description, type, schedule, workflowId, config, status } = req.body;

  const job = await ScheduledJob.create({
    name,
    description,
    type,
    schedule: JSON.stringify(schedule),
    workflowId,
    config: JSON.stringify(config || {}),
    status: status || "active",
    lastRun: null,
    nextRun: calculateNextRun(schedule),
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: job });
}

export async function updateScheduledJob(req, res) {
  const { name, schedule, config, status } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (schedule !== undefined) {
    updateData.schedule = JSON.stringify(schedule);
    updateData.nextRun = calculateNextRun(schedule);
  }
  if (config !== undefined) updateData.config = JSON.stringify(config);
  if (status !== undefined) updateData.status = status;

  const job = await ScheduledJob.update(req.params.id, updateData);
  res.json({ success: true, data: job });
}

export async function deleteScheduledJob(req, res) {
  await ScheduledJob.delete(req.params.id);
  res.json({ success: true, message: "Scheduled job deleted" });
}

export async function runScheduledJobNow(req, res) {
  const job = await ScheduledJob.findById(req.params.id);
  if (!job) return res.status(404).json({ success: false, error: "Job not found" });

  // Mark as running
  await ScheduledJob.update(req.params.id, { lastRun: new Date().toISOString() });

  // Trigger workflow if associated
  if (job.workflowId) {
    await executeWorkflow(job.workflowId, { triggeredBy: "scheduled", jobId: job.id });
  }

  res.json({ success: true, message: "Job triggered" });
}

// ============================================
// WORKFLOW LOGS
// ============================================

export async function getWorkflowLogs(req, res) {
  const { workflowId, status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (workflowId) filters.workflowId = workflowId;
  if (status) filters.status = status;

  const logs = await WorkflowLog.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "created_at",
    order: "desc",
  });

  res.json({ success: true, data: logs });
}

export async function logWorkflowExecution(workflowId, status, userId, duration, details, error = null) {
  return await WorkflowLog.create({
    workflowId,
    status,
    triggeredBy: userId,
    duration,
    details,
    error: error ? JSON.stringify(error) : null,
  });
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getAutomationStats(req, res) {
  const [workflows, tasks, rules] = await Promise.all([
    Workflow.findAll({ limit: 100 }),
    AutomationTask.findAll({ limit: 100 }),
    BusinessRule.findAll({ limit: 100 }),
  ]);

  const workflowStats = {
    total: workflows.length,
    active: workflows.filter(w => w.status === "active").length,
    paused: workflows.filter(w => w.status === "paused").length,
    draft: workflows.filter(w => w.status === "draft").length,
  };

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
    overdue: tasks.filter(t => t.status === "pending" && new Date(t.dueAt) < new Date()).length,
  };

  const ruleStats = {
    total: rules.length,
    active: rules.filter(r => r.status === "active").length,
  };

  // Get execution stats from logs
  const recentLogs = await WorkflowLog.findAll({
    limit: 100,
    orderBy: "created_at",
    order: "desc",
  });

  const executionStats = {
    total: recentLogs.length,
    successful: recentLogs.filter(l => l.status === "success").length,
    failed: recentLogs.filter(l => l.status === "failed").length,
    avgDuration: calculateAvgDuration(recentLogs),
  };

  res.json({
    success: true,
    data: {
      workflows: workflowStats,
      tasks: taskStats,
      rules: ruleStats,
      executions: executionStats,
    },
  });
}

// ============================================
// TEMPLATES
// ============================================

export async function getWorkflowTemplates(req, res) {
  const templates = [
    {
      id: "dealer_onboarding",
      name: "Dealer Onboarding",
      description: "Automated workflow for new dealer registration and verification",
      category: "onboarding",
      nodes: [
        { id: "start", type: "start", position: { x: 100, y: 100 } },
        { id: "welcome", type: "notification", position: { x: 300, y: 100 }, data: { channel: "email", template: "welcome_dealer" } },
        { id: "review_docs", type: "approval", position: { x: 500, y: 100 }, data: { approverRole: "moderator" } },
        { id: "check_docs", type: "condition", position: { x: 700, y: 100 }, data: { field: "documentsApproved" } },
        { id: "verify", type: "task", position: { x: 900, y: 50 }, data: { title: "Verify Dealer Documents" } },
        { id: "reject", type: "notification", position: { x: 900, y: 150 }, data: { channel: "email", template: "dealer_rejected" } },
        { id: "complete", type: "notification", position: { x: 1100, y: 100 }, data: { channel: "email", template: "dealer_approved" } },
        { id: "end", type: "end", position: { x: 1300, y: 100 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "welcome" },
        { id: "e2", source: "welcome", target: "review_docs" },
        { id: "e3", source: "review_docs", target: "check_docs" },
        { id: "e4", source: "check_docs", target: "verify", condition: "approved" },
        { id: "e5", source: "check_docs", target: "reject", condition: "rejected" },
        { id: "e6", source: "verify", target: "complete" },
        { id: "e7", source: "complete", target: "end" },
        { id: "e8", source: "reject", target: "end" },
      ],
    },
    {
      id: "auction_setup",
      name: "Auction Setup",
      description: "Automatically configure new auctions with reminders and notifications",
      category: "auctions",
      nodes: [],
      edges: [],
    },
    {
      id: "complaint_handling",
      name: "Complaint Handling",
      description: "Route and manage customer complaints through approval workflow",
      category: "support",
      nodes: [],
      edges: [],
    },
    {
      id: "vehicle_publishing",
      name: "Vehicle Publishing",
      description: "Review and publish new vehicle listings with quality checks",
      category: "marketplace",
      nodes: [],
      edges: [],
    },
    {
      id: "subscription_renewal",
      name: "Subscription Renewal",
      description: "Automated subscription reminders and renewal processing",
      category: "billing",
      nodes: [],
      edges: [],
    },
  ];

  res.json({ success: true, data: templates });
}

// ============================================
// TRIGGERS & EVENTS
// ============================================

export async function getTriggerTypes(req, res) {
  const triggers = [
    { id: "dealer.registered", name: "Dealer Registered", category: "dealer" },
    { id: "dealer.verified", name: "Dealer Verified", category: "dealer" },
    { id: "dealer.suspended", name: "Dealer Suspended", category: "dealer" },
    { id: "vehicle.listed", name: "Vehicle Listed", category: "vehicle" },
    { id: "vehicle.updated", name: "Vehicle Updated", category: "vehicle" },
    { id: "vehicle.sold", name: "Vehicle Sold", category: "vehicle" },
    { id: "vehicle.expired", name: "Vehicle Expired", category: "vehicle" },
    { id: "auction.created", name: "Auction Created", category: "auction" },
    { id: "auction.started", name: "Auction Started", category: "auction" },
    { id: "auction.ended", name: "Auction Ended", category: "auction" },
    { id: "inspection.booked", name: "Inspection Booked", category: "inspection" },
    { id: "inspection.completed", name: "Inspection Completed", category: "inspection" },
    { id: "finance.submitted", name: "Finance Application Submitted", category: "finance" },
    { id: "finance.approved", name: "Finance Approved", category: "finance" },
    { id: "escrow.created", name: "Escrow Created", category: "escrow" },
    { id: "escrow.completed", name: "Escrow Completed", category: "escrow" },
    { id: "payment.received", name: "Payment Received", category: "payment" },
    { id: "payment.failed", name: "Payment Failed", category: "payment" },
    { id: "complaint.submitted", name: "Complaint Submitted", category: "support" },
    { id: "subscription.expired", name: "Subscription Expired", category: "subscription" },
    { id: "document.uploaded", name: "Document Uploaded", category: "document" },
    { id: "user.suspended", name: "User Suspended", category: "user" },
    { id: "passport.updated", name: "Passport Updated", category: "user" },
    { id: "schedule.daily", name: "Daily (Scheduled)", category: "schedule" },
    { id: "schedule.weekly", name: "Weekly (Scheduled)", category: "schedule" },
    { id: "schedule.monthly", name: "Monthly (Scheduled)", category: "schedule" },
  ];

  res.json({ success: true, data: triggers });
}

export async function getActionTypes(req, res) {
  const actions = [
    { id: "notification.email", name: "Send Email", icon: "mail", category: "notification" },
    { id: "notification.sms", name: "Send SMS", icon: "message-square", category: "notification" },
    { id: "notification.whatsapp", name: "Send WhatsApp", icon: "message-circle", category: "notification" },
    { id: "notification.push", name: "Push Notification", icon: "bell", category: "notification" },
    { id: "notification.internal", name: "Internal Notification", icon: "inbox", category: "notification" },
    { id: "task.create", name: "Create Task", icon: "clipboard-list", category: "task" },
    { id: "task.assign", name: "Assign Task", icon: "user-plus", category: "task" },
    { id: "approval.request", name: "Request Approval", icon: "check-circle", category: "approval" },
    { id: "webhook.call", name: "Call Webhook", icon: "webhook", category: "integration" },
    { id: "api.call", name: "Call API", icon: "code", category: "integration" },
    { id: "database.update", name: "Update Database", icon: "database", category: "data" },
    { id: "delay", name: "Delay", icon: "clock", category: "flow" },
    { id: "condition", name: "Condition", icon: "git-branch", category: "flow" },
    { id: "subscription.update", name: "Update Subscription", icon: "credit-card", category: "subscription" },
    { id: "listing.update", name: "Update Listing", icon: "edit", category: "vehicle" },
    { id: "listing.archive", name: "Archive Listing", icon: "archive", category: "vehicle" },
    { id: "listing.hide", name: "Hide Listing", icon: "eye-off", category: "vehicle" },
    { id: "dealer.suspend", name: "Suspend Dealer", icon: "user-x", category: "dealer" },
    { id: "dealer.activate", name: "Activate Dealer", icon: "user-check", category: "dealer" },
    { id: "escalate", name: "Escalate", icon: "arrow-up-circle", category: "support" },
  ];

  res.json({ success: true, data: actions });
}

// ============================================
// AI SUGGESTIONS
// ============================================

export async function getAISuggestions(req, res) {
  // Analyze patterns and suggest automations
  const suggestions = [
    {
      id: "sug_1",
      type: "repetitive_task",
      title: "Automate Dealer Verification Reminders",
      description: "You have 47 pending dealer verifications. Create a daily reminder workflow.",
      potential: { timeSaved: "2.5 hours/day", efficiency: "+35%" },
      workflowTemplate: "dealer_onboarding",
    },
    {
      id: "sug_2",
      type: "bottleneck",
      title: "Slow Approval Process Detected",
      description: "Auction approvals take an average of 4.2 hours. Automate pre-approval checks.",
      potential: { timeSaved: "3 hours/day", efficiency: "+45%" },
      workflowTemplate: "auction_setup",
    },
    {
      id: "sug_3",
      type: "suggestion",
      title: "Vehicle Expiry Notifications",
      description: "Listings without updates in 30 days have 60% lower engagement. Send reminders.",
      potential: { timeSaved: "1 hour/day", efficiency: "+25%" },
      workflowTemplate: "vehicle_publishing",
    },
    {
      id: "sug_4",
      type: "improvement",
      title: "Finance Application Status Updates",
      description: "Users frequently inquire about finance status. Automate status notifications.",
      potential: { timeSaved: "1.5 hours/day", efficiency: "+40%" },
    },
  ];

  res.json({ success: true, data: suggestions });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function simulateExecutionPath(nodes, edges, context) {
  const path = [];
  const warnings = [];
  const outcomes = [];

  // Find start node
  const startNode = nodes.find(n => n.type === "start");
  if (!startNode) {
    warnings.push("No start node found");
    return { path: [], warnings, duration: 0, outcomes };
  }

  path.push({ nodeId: startNode.id, nodeType: startNode.type });

  // Simple BFS to find execution path
  const visited = new Set();
  const queue = [startNode.id];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentNode = nodes.find(n => n.id === currentId);
    if (!currentNode || currentNode.type === "end") break;

    // Find outgoing edges
    const outgoingEdges = edges.filter(e => e.source === currentId);

    if (outgoingEdges.length === 0 && currentNode.type !== "end") {
      warnings.push(`Node ${currentId} has no outgoing edges`);
    }

    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        const targetNode = nodes.find(n => n.id === edge.target);
        path.push({ nodeId: edge.target, nodeType: targetNode?.type, condition: edge.condition });
        queue.push(edge.target);
      }
    }

    // Check for common issues
    if (currentNode.type === "delay" && currentNode.data?.duration > 86400) {
      warnings.push(`Long delay detected: ${currentNode.data.duration} seconds`);
    }
  }

  // Estimate duration
  const duration = path.reduce((sum, node) => {
    const durations = { delay: 60, notification: 5, approval: 3600, task: 1800 };
    return sum + (durations[node.nodeType] || 10);
  }, 0);

  outcomes.push({ name: "Complete", probability: 85 });
  outcomes.push({ name: "Requires Approval", probability: 10 });
  outcomes.push({ name: "Failed", probability: 5 });

  return { path, warnings, duration, outcomes };
}

function evaluateConditions(conditions, context) {
  for (const condition of conditions) {
    const { field, operator, value } = condition;
    const contextValue = getNestedValue(context, field);

    switch (operator) {
      case "equals":
        if (contextValue !== value) return false;
        break;
      case "not_equals":
        if (contextValue === value) return false;
        break;
      case "greater_than":
        if (contextValue <= value) return false;
        break;
      case "less_than":
        if (contextValue >= value) return false;
        break;
      case "contains":
        if (!contextValue?.includes(value)) return false;
        break;
      case "in":
        if (!value.includes(contextValue)) return false;
        break;
    }
  }
  return true;
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

function calculateDueDate(timeout) {
  if (!timeout) return null;
  const date = new Date();
  date.setHours(date.getHours() + timeout);
  return date.toISOString();
}

function calculateNextRun(schedule) {
  const { frequency, time, dayOfWeek, dayOfMonth } = schedule;
  const now = new Date();
  const [hours, minutes] = (time || "09:00").split(":");

  const next = new Date();
  next.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  if (next <= now) {
    switch (frequency) {
      case "daily":
        next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
    }
  }

  return next.toISOString();
}

function replaceVariables(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables || {})) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

function calculateAvgDuration(logs) {
  const logsWithDuration = logs.filter(l => l.duration);
  if (logsWithDuration.length === 0) return 0;
  const sum = logsWithDuration.reduce((acc, l) => acc + l.duration, 0);
  return Math.round(sum / logsWithDuration.length);
}

async function executeWorkflow(workflowId, context) {
  const workflow = await Workflow.findById(workflowId);
  if (!workflow || workflow.status !== "active") return;

  const startTime = Date.now();
  try {
    // Parse workflow definition
    const nodes = JSON.parse(workflow.nodes || "[]");
    const edges = JSON.parse(workflow.edges || "[]");

    // Execute workflow (simplified - full implementation would traverse the graph)
    await logWorkflowExecution(workflowId, "success", context.triggeredBy, Date.now() - startTime, "Workflow executed");
  } catch (error) {
    await logWorkflowExecution(workflowId, "failed", context.triggeredBy, Date.now() - startTime, "Workflow failed", error);
  }
}
