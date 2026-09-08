// ============================================================
// KAYAD LOW-CODE PLATFORM CONTROLLER
// Dynamic Business Object Creation & Management
// ============================================================

import BusinessObject from "../models/BusinessObject.js";
import ObjectField from "../models/ObjectField.js";
import ObjectRelationship from "../models/ObjectRelationship.js";
import FormDefinition from "../models/FormDefinition.js";
import ViewDefinition from "../models/ViewDefinition.js";
import ObjectPermission from "../models/ObjectPermission.js";
import ObjectIndex from "../models/ObjectIndex.js";
import ObjectVersion from "../models/ObjectVersion.js";
import CustomDashboard from "../models/CustomDashboard.js";

// Field Types available
const FIELD_TYPES = [
  { id: 'text', name: 'Text', icon: 'type', category: 'basic' },
  { id: 'number', name: 'Number', icon: 'hash', category: 'basic' },
  { id: 'currency', name: 'Currency', icon: 'dollar-sign', category: 'basic' },
  { id: 'percentage', name: 'Percentage', icon: 'percent', category: 'basic' },
  { id: 'date', name: 'Date', icon: 'calendar', category: 'basic' },
  { id: 'time', name: 'Time', icon: 'clock', category: 'basic' },
  { id: 'datetime', name: 'Date & Time', icon: 'calendar-clock', category: 'basic' },
  { id: 'email', name: 'Email', icon: 'mail', category: 'basic' },
  { id: 'phone', name: 'Phone', icon: 'phone', category: 'basic' },
  { id: 'boolean', name: 'Yes/No', icon: 'toggle-left', category: 'basic' },
  { id: 'dropdown', name: 'Dropdown', icon: 'chevron-down', category: 'choice' },
  { id: 'radio', name: 'Radio', icon: 'circle-dot', category: 'choice' },
  { id: 'checkbox', name: 'Checkbox', icon: 'check-square', category: 'choice' },
  { id: 'tags', name: 'Tags', icon: 'tag', category: 'choice' },
  { id: 'rich_text', name: 'Rich Text', icon: 'file-text', category: 'advanced' },
  { id: 'image', name: 'Image', icon: 'image', category: 'media' },
  { id: 'video', name: 'Video', icon: 'video', category: 'media' },
  { id: 'file', name: 'File', icon: 'file', category: 'media' },
  { id: 'pdf', name: 'PDF', icon: 'file-text', category: 'media' },
  { id: 'signature', name: 'Signature', icon: 'pen-tool', category: 'advanced' },
  { id: 'gps', name: 'GPS Location', icon: 'map-pin', category: 'advanced' },
  { id: 'barcode', name: 'Barcode', icon: 'barcode', category: 'advanced' },
  { id: 'qr_code', name: 'QR Code', icon: 'qr-code', category: 'advanced' },
  { id: 'color', name: 'Color', icon: 'palette', category: 'advanced' },
  { id: 'repeater', name: 'Repeater', icon: 'copy', category: 'advanced' },
  { id: 'lookup', name: 'Lookup', icon: 'search', category: 'relation' },
  { id: 'formula', name: 'Formula', icon: 'calculator', category: 'calculated' },
  { id: 'json', name: 'JSON', icon: 'code', category: 'advanced' },
  { id: 'user', name: 'User Reference', icon: 'user', category: 'relation' },
  { id: 'object', name: 'Related Object', icon: 'box', category: 'relation' },
];

// ============================================
// BUSINESS OBJECTS
// ============================================

export async function getBusinessObjects(req, res) {
  const { status, category, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;
  if (category) filters.category = category;

  const objects = await BusinessObject.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "updated_at",
    order: "desc",
  });

  // Get field counts for each object
  const objectsWithCounts = await Promise.all(
    objects.map(async (obj) => {
      const fields = await ObjectField.findAll({ filters: { objectId: obj.id } });
      return { ...obj, fieldCount: fields.length };
    })
  );

  res.json({ success: true, data: objectsWithCounts });
}

export async function getBusinessObject(req, res) {
  const object = await BusinessObject.findById(req.params.id);
  if (!object) return res.status(404).json({ success: false, error: "Business object not found" });

  // Get fields
  const fields = await ObjectField.findAll({ filters: { objectId: req.params.id } });

  // Get relationships
  const relationships = await ObjectRelationship.findAll({ filters: { objectId: req.params.id } });

  // Get permissions
  const permissions = await ObjectPermission.findAll({ filters: { objectId: req.params.id } });

  // Get forms
  const forms = await FormDefinition.findAll({ filters: { objectId: req.params.id } });

  // Get views
  const views = await ViewDefinition.findAll({ filters: { objectId: req.params.id } });

  // Get versions
  const versions = await ObjectVersion.findAll({
    filters: { objectId: req.params.id },
    limit: 10,
    orderBy: "version",
    order: "desc",
  });

  res.json({
    success: true,
    data: { ...object, fields, relationships, permissions, forms, views, versions },
  });
}

export async function createBusinessObject(req, res) {
  const {
    name,
    singularName,
    pluralName,
    description,
    category,
    icon,
    color,
    fields = [],
    relationships = [],
    permissions = [],
    settings = {},
  } = req.body;

  // Generate object key from name
  const key = generateObjectKey(name);

  // Check for duplicate key
  const existing = await BusinessObject.findAll({ filters: { objectKey: key } });
  if (existing.length > 0) {
    return res.status(400).json({ success: false, error: "An object with this name already exists" });
  }

  // Create the business object
  const object = await BusinessObject.create({
    name,
    singularName: singularName || name,
    pluralName: pluralName || `${name}s`,
    description,
    category: category || 'custom',
    icon: icon || 'box',
    color: color || '#17244B',
    objectKey: key,
    status: 'draft',
    settings: typeof settings === 'object' ? JSON.stringify(settings) : settings,
    createdBy: req.user?.id,
  });

  // Create fields
  for (const field of fields) {
    await ObjectField.create({
      objectId: object.id,
      ...field,
      fieldKey: field.name.toLowerCase().replace(/\s+/g, '_'),
      metadata: typeof field.metadata === 'object' ? JSON.stringify(field.metadata) : field.metadata,
      options: typeof field.options === 'object' ? JSON.stringify(field.options) : field.options,
    });
  }

  // Create relationships
  for (const rel of relationships) {
    await ObjectRelationship.create({
      objectId: object.id,
      targetObjectId: rel.targetObjectId,
      relationshipType: rel.relationshipType,
      foreignKeyField: rel.foreignKeyField || `${key}_id`,
      label: rel.label,
    });
  }

  // Create permissions
  for (const perm of permissions) {
    await ObjectPermission.create({
      objectId: object.id,
      role: perm.role,
      canView: perm.canView ?? true,
      canCreate: perm.canCreate ?? true,
      canEdit: perm.canEdit ?? true,
      canDelete: perm.canDelete ?? true,
      canExport: perm.canExport ?? false,
      canApprove: perm.canApprove ?? false,
    });
  }

  // Create initial version
  await ObjectVersion.create({
    objectId: object.id,
    version: 1,
    changes: JSON.stringify({ type: 'create', fields: fields.length, relationships: relationships.length }),
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: object });
}

export async function updateBusinessObject(req, res) {
  const { name, singularName, pluralName, description, category, icon, color, status, settings } = req.body;

  const existing = await BusinessObject.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Business object not found" });

  const updateData = { updatedBy: req.user?.id, updatedAt: new Date().toISOString() };

  if (name !== undefined) updateData.name = name;
  if (singularName !== undefined) updateData.singularName = singularName;
  if (pluralName !== undefined) updateData.pluralName = pluralName;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (icon !== undefined) updateData.icon = icon;
  if (color !== undefined) updateData.color = color;
  if (status !== undefined) updateData.status = status;
  if (settings !== undefined) updateData.settings = typeof settings === 'object' ? JSON.stringify(settings) : settings;

  const object = await BusinessObject.update(req.params.id, updateData);

  // Log version if publishing
  if (status === 'published' && existing.status !== 'published') {
    const versions = await ObjectVersion.findAll({ filters: { objectId: req.params.id } });
    await ObjectVersion.create({
      objectId: object.id,
      version: versions.length + 1,
      changes: JSON.stringify({ type: 'publish' }),
      createdBy: req.user?.id,
    });
  }

  res.json({ success: true, data: object });
}

export async function deleteBusinessObject(req, res) {
  const existing = await BusinessObject.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Business object not found" });

  // Delete all related data
  await ObjectField.deleteAll({ objectId: req.params.id });
  await ObjectRelationship.deleteAll({ objectId: req.params.id });
  await ObjectPermission.deleteAll({ objectId: req.params.id });
  await FormDefinition.deleteAll({ objectId: req.params.id });
  await ViewDefinition.deleteAll({ objectId: req.params.id });
  await ObjectVersion.deleteAll({ objectId: req.params.id });

  await BusinessObject.delete(req.params.id);

  res.json({ success: true, message: "Business object deleted" });
}

export async function publishBusinessObject(req, res) {
  const existing = await BusinessObject.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Business object not found" });

  // Validate required fields
  const fields = await ObjectField.findAll({ filters: { objectId: req.params.id } });
  const hasNameField = fields.some(f => f.fieldKey === 'name' || f.fieldKey === 'title');

  if (!hasNameField) {
    return res.status(400).json({ success: false, error: "Object must have a 'name' or 'title' field" });
  }

  // Generate SQL for the table (would be executed in production)
  const tableSql = generateTableSql(existing, fields);

  const object = await BusinessObject.update(req.params.id, {
    status: 'published',
    tableName: `custom_${existing.objectKey}`,
    schema: JSON.stringify({ fields, tableSql }),
    publishedAt: new Date().toISOString(),
  });

  // Log version
  const versions = await ObjectVersion.findAll({ filters: { objectId: req.params.id } });
  await ObjectVersion.create({
    objectId: object.id,
    version: versions.length + 1,
    changes: JSON.stringify({ type: 'publish', tableSql }),
    createdBy: req.user?.id,
  });

  res.json({ success: true, data: object, schema: tableSql });
}

export async function cloneBusinessObject(req, res) {
  const existing = await BusinessObject.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Business object not found" });

  // Get all related data
  const fields = await ObjectField.findAll({ filters: { objectId: req.params.id } });
  const relationships = await ObjectRelationship.findAll({ filters: { objectId: req.params.id } });
  const permissions = await ObjectPermission.findAll({ filters: { objectId: req.params.id } });

  // Create new object
  const newObject = await BusinessObject.create({
    name: `${existing.name} (Copy)`,
    singularName: `${existing.singularName} (Copy)`,
    pluralName: `${existing.pluralName} (Copy)`,
    description: existing.description,
    category: existing.category,
    icon: existing.icon,
    color: existing.color,
    objectKey: `${existing.objectKey}_copy_${Date.now()}`,
    status: 'draft',
    settings: existing.settings,
    createdBy: req.user?.id,
  });

  // Clone fields
  for (const field of fields) {
    await ObjectField.create({
      objectId: newObject.id,
      fieldName: field.fieldName,
      fieldKey: `${field.fieldKey}_copy`,
      fieldType: field.fieldType,
      required: field.required,
      unique: field.unique,
      defaultValue: field.defaultValue,
      placeholder: field.placeholder,
      helpText: field.helpText,
      metadata: field.metadata,
      options: field.options,
      displayOrder: field.displayOrder,
    });
  }

  // Clone permissions
  for (const perm of permissions) {
    await ObjectPermission.create({
      objectId: newObject.id,
      ...perm,
    });
  }

  res.status(201).json({ success: true, data: newObject });
}

// ============================================
// OBJECT FIELDS
// ============================================

export async function getObjectFields(req, res) {
  const fields = await ObjectField.findAll({ filters: { objectId: req.params.objectId } });
  res.json({ success: true, data: fields });
}

export async function createObjectField(req, res) {
  const { objectId, fieldName, fieldType, required, unique, defaultValue, placeholder, helpText, metadata, options, displayOrder } = req.body;

  const fieldKey = fieldName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const field = await ObjectField.create({
    objectId,
    fieldName,
    fieldKey,
    fieldType,
    required: required ?? false,
    unique: unique ?? false,
    defaultValue,
    placeholder,
    helpText,
    metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata,
    options: typeof options === 'object' ? JSON.stringify(options) : options,
    displayOrder: displayOrder || 0,
  });

  res.status(201).json({ success: true, data: field });
}

export async function updateObjectField(req, res) {
  const { fieldName, fieldType, required, unique, defaultValue, placeholder, helpText, metadata, options, displayOrder } = req.body;

  const updateData = {};
  if (fieldName !== undefined) {
    updateData.fieldName = fieldName;
    updateData.fieldKey = fieldName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }
  if (fieldType !== undefined) updateData.fieldType = fieldType;
  if (required !== undefined) updateData.required = required;
  if (unique !== undefined) updateData.unique = unique;
  if (defaultValue !== undefined) updateData.defaultValue = defaultValue;
  if (placeholder !== undefined) updateData.placeholder = placeholder;
  if (helpText !== undefined) updateData.helpText = helpText;
  if (metadata !== undefined) updateData.metadata = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;
  if (options !== undefined) updateData.options = typeof options === 'object' ? JSON.stringify(options) : options;
  if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

  const field = await ObjectField.update(req.params.id, updateData);
  res.json({ success: true, data: field });
}

export async function deleteObjectField(req, res) {
  await ObjectField.delete(req.params.id);
  res.json({ success: true, message: "Field deleted" });
}

export async function reorderObjectFields(req, res) {
  const { fields } = req.body; // Array of { id, displayOrder }

  for (const item of fields) {
    await ObjectField.update(item.id, { displayOrder: item.displayOrder });
  }

  res.json({ success: true, message: "Fields reordered" });
}

// ============================================
// RELATIONSHIPS
// ============================================

export async function getObjectRelationships(req, res) {
  const relationships = await ObjectRelationship.findAll({ filters: { objectId: req.params.objectId } });

  // Enrich with target object info
  const enriched = await Promise.all(
    relationships.map(async (rel) => {
      const target = await BusinessObject.findById(rel.targetObjectId);
      return { ...rel, targetObject: target };
    })
  );

  res.json({ success: true, data: enriched });
}

export async function createObjectRelationship(req, res) {
  const { objectId, targetObjectId, relationshipType, foreignKeyField, label } = req.body;

  const relationship = await ObjectRelationship.create({
    objectId,
    targetObjectId,
    relationshipType,
    foreignKeyField: foreignKeyField || `${relationshipType}_id`,
    label,
  });

  res.status(201).json({ success: true, data: relationship });
}

export async function updateObjectRelationship(req, res) {
  const { relationshipType, foreignKeyField, label } = req.body;

  const updateData = {};
  if (relationshipType !== undefined) updateData.relationshipType = relationshipType;
  if (foreignKeyField !== undefined) updateData.foreignKeyField = foreignKeyField;
  if (label !== undefined) updateData.label = label;

  const relationship = await ObjectRelationship.update(req.params.id, updateData);
  res.json({ success: true, data: relationship });
}

export async function deleteObjectRelationship(req, res) {
  await ObjectRelationship.delete(req.params.id);
  res.json({ success: true, message: "Relationship deleted" });
}

// ============================================
// FORM DEFINITIONS
// ============================================

export async function getFormDefinitions(req, res) {
  const forms = await FormDefinition.findAll({ filters: { objectId: req.params.objectId } });
  res.json({ success: true, data: forms });
}

export async function createFormDefinition(req, res) {
  const { objectId, name, description, layout, validation, settings } = req.body;

  const form = await FormDefinition.create({
    objectId,
    name,
    description,
    layout: typeof layout === 'object' ? JSON.stringify(layout) : layout,
    validation: typeof validation === 'object' ? JSON.stringify(validation) : validation,
    settings: typeof settings === 'object' ? JSON.stringify(settings) : settings,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: form });
}

export async function updateFormDefinition(req, res) {
  const { name, description, layout, validation, settings } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (layout !== undefined) updateData.layout = typeof layout === 'object' ? JSON.stringify(layout) : layout;
  if (validation !== undefined) updateData.validation = typeof validation === 'object' ? JSON.stringify(validation) : validation;
  if (settings !== undefined) updateData.settings = typeof settings === 'object' ? JSON.stringify(settings) : settings;

  const form = await FormDefinition.update(req.params.id, updateData);
  res.json({ success: true, data: form });
}

export async function deleteFormDefinition(req, res) {
  await FormDefinition.delete(req.params.id);
  res.json({ success: true, message: "Form deleted" });
}

// ============================================
// VIEW DEFINITIONS
// ============================================

export async function getViewDefinitions(req, res) {
  const views = await ViewDefinition.findAll({ filters: { objectId: req.params.objectId } });
  res.json({ success: true, data: views });
}

export async function createViewDefinition(req, res) {
  const { objectId, name, viewType, columns, filters, sorting, grouping, settings } = req.body;

  const view = await ViewDefinition.create({
    objectId,
    name,
    viewType: viewType || 'table',
    columns: typeof columns === 'object' ? JSON.stringify(columns) : columns,
    filters: typeof filters === 'object' ? JSON.stringify(filters) : filters,
    sorting: typeof sorting === 'object' ? JSON.stringify(sorting) : sorting,
    grouping: typeof grouping === 'object' ? JSON.stringify(grouping) : grouping,
    settings: typeof settings === 'object' ? JSON.stringify(settings) : settings,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: view });
}

export async function updateViewDefinition(req, res) {
  const { name, viewType, columns, filters, sorting, grouping, settings } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (viewType !== undefined) updateData.viewType = viewType;
  if (columns !== undefined) updateData.columns = typeof columns === 'object' ? JSON.stringify(columns) : columns;
  if (filters !== undefined) updateData.filters = typeof filters === 'object' ? JSON.stringify(filters) : filters;
  if (sorting !== undefined) updateData.sorting = typeof sorting === 'object' ? JSON.stringify(sorting) : sorting;
  if (grouping !== undefined) updateData.grouping = typeof grouping === 'object' ? JSON.stringify(grouping) : grouping;
  if (settings !== undefined) updateData.settings = typeof settings === 'object' ? JSON.stringify(settings) : settings;

  const view = await ViewDefinition.update(req.params.id, updateData);
  res.json({ success: true, data: view });
}

export async function deleteViewDefinition(req, res) {
  await ViewDefinition.delete(req.params.id);
  res.json({ success: true, message: "View deleted" });
}

// ============================================
// PERMISSIONS
// ============================================

export async function getObjectPermissions(req, res) {
  const permissions = await ObjectPermission.findAll({ filters: { objectId: req.params.objectId } });
  res.json({ success: true, data: permissions });
}

export async function updateObjectPermissions(req, res) {
  const { permissions } = req.body;

  // Delete existing permissions
  await ObjectPermission.deleteAll({ objectId: req.params.objectId });

  // Create new permissions
  for (const perm of permissions) {
    await ObjectPermission.create({
      objectId: req.params.objectId,
      ...perm,
    });
  }

  const newPermissions = await ObjectPermission.findAll({ filters: { objectId: req.params.objectId } });
  res.json({ success: true, data: newPermissions });
}

// ============================================
// CUSTOM DASHBOARDS
// ============================================

export async function getCustomDashboards(req, res) {
  const dashboards = await CustomDashboard.findAll({
    orderBy: "created_at",
    order: "desc",
  });
  res.json({ success: true, data: dashboards });
}

export async function createCustomDashboard(req, res) {
  const { name, description, widgets, layout, filters } = req.body;

  const dashboard = await CustomDashboard.create({
    name,
    description,
    widgets: typeof widgets === 'object' ? JSON.stringify(widgets) : widgets,
    layout: typeof layout === 'object' ? JSON.stringify(layout) : layout,
    filters: typeof filters === 'object' ? JSON.stringify(filters) : filters,
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: dashboard });
}

export async function updateCustomDashboard(req, res) {
  const { name, description, widgets, layout, filters } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (widgets !== undefined) updateData.widgets = typeof widgets === 'object' ? JSON.stringify(widgets) : widgets;
  if (layout !== undefined) updateData.layout = typeof layout === 'object' ? JSON.stringify(layout) : layout;
  if (filters !== undefined) updateData.filters = typeof filters === 'object' ? JSON.stringify(filters) : filters;

  const dashboard = await CustomDashboard.update(req.params.id, updateData);
  res.json({ success: true, data: dashboard });
}

export async function deleteCustomDashboard(req, res) {
  await CustomDashboard.delete(req.params.id);
  res.json({ success: true, message: "Dashboard deleted" });
}

// ============================================
// OBJECT VERSIONS
// ============================================

export async function getObjectVersions(req, res) {
  const versions = await ObjectVersion.findAll({
    filters: { objectId: req.params.objectId },
    orderBy: "version",
    order: "desc",
  });
  res.json({ success: true, data: versions });
}

export async function rollbackObjectVersion(req, res) {
  const { versionId } = req.params;

  const version = await ObjectVersion.findById(versionId);
  if (!version) return res.status(404).json({ success: false, error: "Version not found" });

  // In production, this would restore the object's state from the version snapshot
  res.json({ success: true, message: `Rolled back to version ${version.version}` });
}

// ============================================
// API GENERATION
// ============================================

export async function generateApi(req, res) {
  const object = await BusinessObject.findById(req.params.id);
  if (!object) return res.status(404).json({ success: false, error: "Business object not found" });

  const fields = await ObjectField.findAll({ filters: { objectId: req.params.id } });

  // Generate REST API endpoints
  const api = {
    endpoints: [
      { method: 'GET', path: `/api/objects/${object.objectKey}`, description: 'List all records' },
      { method: 'GET', path: `/api/objects/${object.objectKey}/:id`, description: 'Get single record' },
      { method: 'POST', path: `/api/objects/${object.objectKey}`, description: 'Create record' },
      { method: 'PUT', path: `/api/objects/${object.objectKey}/:id`, description: 'Update record' },
      { method: 'DELETE', path: `/api/objects/${object.objectKey}/:id`, description: 'Delete record' },
      { method: 'POST', path: `/api/objects/${object.objectKey}/bulk`, description: 'Bulk create/update' },
      { method: 'GET', path: `/api/objects/${object.objectKey}/export`, description: 'Export records' },
    ],
    schema: {
      name: object.name,
      fields: fields.map(f => ({
        name: f.fieldName,
        key: f.fieldKey,
        type: f.fieldType,
        required: f.required,
      })),
    },
    sdk: generateSdkCode(object, fields),
  };

  res.json({ success: true, data: api });
}

// ============================================
// FIELD TYPES
// ============================================

export async function getFieldTypes(req, res) {
  const grouped = FIELD_TYPES.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {});

  res.json({ success: true, data: { types: FIELD_TYPES, grouped } });
}

// ============================================
// AI ASSISTANT
// ============================================

export async function suggestBusinessObject(req, res) {
  const { description } = req.body;

  // Parse natural language description and suggest schema
  const suggestions = analyzeDescription(description);

  res.json({ success: true, data: suggestions });
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getPlatformStats(req, res) {
  const [objects, fields, forms, views] = await Promise.all([
    BusinessObject.findAll({ limit: 1000 }),
    ObjectField.findAll({ limit: 10000 }),
    FormDefinition.findAll({ limit: 1000 }),
    ViewDefinition.findAll({ limit: 1000 }),
  ]);

  res.json({
    success: true,
    data: {
      totalObjects: objects.length,
      publishedObjects: objects.filter(o => o.status === 'published').length,
      draftObjects: objects.filter(o => o.status === 'draft').length,
      totalFields: fields.length,
      totalForms: forms.length,
      totalViews: views.length,
      byCategory: objects.reduce((acc, o) => {
        acc[o.category] = (acc[o.category] || 0) + 1;
        return acc;
      }, {}),
    },
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateObjectKey(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 50);
}

function generateTableSql(object, fields) {
  const lines = [`CREATE TABLE custom_${object.objectKey} (`];
  lines.push(`  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);

  for (const field of fields) {
    const sqlType = mapFieldTypeToSql(field.fieldType);
    const nullable = field.required ? 'NOT NULL' : '';
    const unique = field.unique ? 'UNIQUE' : '';
    const defaultVal = field.defaultValue ? `DEFAULT ${field.defaultValue}` : '';
    lines.push(`  ${field.fieldKey} ${sqlType} ${nullable} ${unique} ${defaultVal},`);
  }

  lines.push(`  created_at TIMESTAMP DEFAULT NOW(),`);
  lines.push(`  updated_at TIMESTAMP DEFAULT NOW(),`);
  lines.push(`  created_by UUID REFERENCES users(id),`);
  lines.push(`  updated_by UUID REFERENCES users(id)`);
  lines.push(`);`);

  return lines.join('\n');
}

function mapFieldTypeToSql(fieldType) {
  const mapping = {
    text: 'VARCHAR(255)',
    rich_text: 'TEXT',
    number: 'INTEGER',
    currency: 'DECIMAL(15,2)',
    percentage: 'DECIMAL(5,2)',
    boolean: 'BOOLEAN',
    date: 'DATE',
    time: 'TIME',
    datetime: 'TIMESTAMP',
    email: 'VARCHAR(255)',
    phone: 'VARCHAR(50)',
    image: 'VARCHAR(500)',
    video: 'VARCHAR(500)',
    file: 'VARCHAR(500)',
    json: 'JSONB',
    gps: 'JSONB',
    lookup: 'UUID',
    user: 'UUID',
    object: 'UUID',
  };
  return mapping[fieldType] || 'VARCHAR(255)';
}

function generateSdkCode(object, fields) {
  return `
// KAYAD SDK for ${object.name}
// Generated automatically

import { api } from './api';

export const ${object.objectKey}API = {
  list: (params) => api.get('/objects/${object.objectKey}', { params }),
  get: (id) => api.get('/objects/${object.objectKey}/${id}'),
  create: (data) => api.post('/objects/${object.objectKey}', data),
  update: (id, data) => api.put('/objects/${object.objectKey}/${id}', data),
  delete: (id) => api.delete('/objects/${object.objectKey}/${id}'),
};
`;
}

function analyzeDescription(description) {
  // Simple AI-like analysis to suggest schema from description
  const suggestions = {
    name: '',
    fields: [],
    relationships: [],
    suggestedViews: [],
    suggestedPermissions: [],
  };

  // Extract potential entity name
  const words = description.split(' ');
  if (words.length > 0) {
    suggestions.name = words
      .filter(w => w.length > 3 && !['with', 'that', 'have', 'this', 'should'].includes(w.toLowerCase()))
      .slice(0, 3)
      .join(' ');
  }

  // Detect common field patterns
  const patterns = [
    { pattern: /name|title|label/i, field: { fieldName: 'Name', fieldType: 'text', required: true } },
    { pattern: /description|details/i, field: { fieldName: 'Description', fieldType: 'rich_text' } },
    { pattern: /price|cost|amount/i, field: { fieldName: 'Price', fieldType: 'currency' } },
    { pattern: /date|time|schedule/i, field: { fieldName: 'Date', fieldType: 'date' } },
    { pattern: /status|state/i, field: { fieldName: 'Status', fieldType: 'dropdown', options: ['active', 'inactive', 'pending'] } },
    { pattern: /phone|telephone|mobile/i, field: { fieldName: 'Phone', fieldType: 'phone' } },
    { pattern: /email/i, field: { fieldName: 'Email', fieldType: 'email' } },
    { pattern: /image|photo|picture/i, field: { fieldName: 'Image', fieldType: 'image' } },
    { pattern: /address|location/i, field: { fieldName: 'Address', fieldType: 'text' } },
    { pattern: /notes|comments|remarks/i, field: { fieldName: 'Notes', fieldType: 'rich_text' } },
    { pattern: /assigned|responsible/i, field: { fieldName: 'Assigned To', fieldType: 'user' } },
  ];

  for (const { pattern, field } of patterns) {
    if (pattern.test(description)) {
      suggestions.fields.push(field);
    }
  }

  // Always add standard fields
  if (!suggestions.fields.find(f => f.fieldName === 'Name')) {
    suggestions.fields.unshift({ fieldName: 'Name', fieldType: 'text', required: true });
  }
  suggestions.fields.push({ fieldName: 'Created At', fieldType: 'datetime' });
  suggestions.fields.push({ fieldName: 'Updated At', fieldType: 'datetime' });

  // Suggest default views
  suggestions.suggestedViews = [
    { name: 'All Records', viewType: 'table' },
    { name: 'Kanban Board', viewType: 'kanban' },
    { name: 'Calendar', viewType: 'calendar' },
  ];

  // Suggest standard permissions
  suggestions.suggestedPermissions = [
    { role: 'admin', canView: true, canCreate: true, canEdit: true, canDelete: true },
    { role: 'editor', canView: true, canCreate: true, canEdit: true, canDelete: false },
    { role: 'viewer', canView: true, canCreate: false, canEdit: false, canDelete: false },
  ];

  return suggestions;
}
