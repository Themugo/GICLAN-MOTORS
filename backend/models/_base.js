import { getSupabase } from "../utils/supabase.js";
import { mapKeyOut, mapRowIn, SEARCHABLE_FIELDS, FIELD_ALIASES, camelToSnake, normalizeSelect } from "../utils/fieldMap.js";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const TABLE_MAP = {
  User: "users", UserAuth: "user_auth", Car: "cars", Bid: "bids",
  Escrow: "escrows", Payment: "payments", Chat: "chats", Message: "messages",
  Notification: "notifications", Favorite: "favorites", Review: "reviews",
  Dealer: "dealers", DealerHealthScore: "dealer_health_scores",
  DealerTeam: "dealer_teams", DealerTrustScore: "dealer_trust_scores",
  DealerVerification: "dealer_verifications",
  AuditLog: "audit_logs", SecurityLog: "security_logs",
  RefreshToken: "refresh_tokens", Dispute: "disputes", Evidence: "evidence",
  Lead: "leads", LeadActivity: "lead_activities",
  SupportTicket: "support_tickets", FeatureFlag: "feature_flags", AdSlot: "ad_slots", HeroSlide: "hero_slides", LoanApplication: "loan_applications", MarketingCampaign: "marketing_campaigns",
  PlatformConfig: "platform_config", Announcement: "announcements",
  SavedSearch: "saved_searches", Report: "reports",
  Transaction: "transactions", Subscription: "subscriptions",
  MarketData: "market_data", MarketPricing: "market_pricing",
  BrandDepreciation: "brand_depreciation", MileageImpact: "mileage_impact",
  VehicleValuation: "vehicle_valuations",
  VehicleMarketAnalytics: "vehicle_market_analytics",
  SearchAnalytics: "search_analytics", ListingQuality: "listing_quality",
  MarketplaceHealth: "marketplace_health", FraudDetection: "fraud_detection",
  ConversionFunnel: "conversion_funnels", Organization: "organizations",
  LedgerAccount: "ledger_accounts",
  LedgerEntry: "ledger_entries",
  ReconciliationRecord: "reconciliation_records",
  ReconciliationReport: "reconciliation_reports",
  EscrowAnomaly: "escrow_anomalies", EscrowRiskScore: "escrow_risk_scores",
  EscrowAudit: "escrow_audits",
  AuctionIntegrityFlag: "auction_integrity_flags",
  AuctionRiskProfile: "auction_risk_profiles",
  MpesaTransaction: "mpesa_transactions", SmsBidder: "sms_bidders",
  Contact: "contacts",
  NotificationAudit: "notification_audit",
  NtsaVerificationRequest: "ntsa_verification_requests",
  InspectionOrder: "vehicle_inspections",
  InspectorApplication: "inspector_applications",
  ErrorBudget: "error_budgets", IdempotencyKey: "idempotency_keys",
  IdempotencyAuditLog: "idempotency_audit_logs",
  JobFailure: "job_failures", Ad: "ads", AdminAlert: "admin_alerts",
  Event: "events", DuplicateVehicleLog: "duplicate_vehicle_logs",
  Referral: "referrals", Feedback: "feedback",
  DemandSignals: "demand_signals",
  // Fixed (Final Integration Phase 4 - inspection frontend
  // integration): was "global_settings" - confirmed directly against
  // a real, migrated database (\dt) that no such table exists at all.
  // The real, existing settings table is "system_settings" - found
  // reproducing the real crash ("relation \"public.global_settings\"
  // does not exist") tracing why the real inspection-order endpoint
  // failed on every request. Note: system_settings is a real
  // key/value store (one row per setting key), not a single flat
  // settings document - GlobalSettings.findOne() (no filter) will
  // return an arbitrary row, so a direct field like `.ghostCheckFee`
  // will not be populated from this table's real shape. The one real
  // caller of this (backend/routes/inspectionRoutes.js's order
  // creation) already has its own safe fallback
  // (`settings?.ghostCheckFee || 2500`), so this remains correct,
  // graceful behavior - not a redesign of the settings table, which
  // is out of this phase's own scope.
  GlobalSettings: "system_settings",
  TransactionLedger: "transaction_ledger", Localization: "localizations",
  UserPreference: "user_preferences",
  BidLog: "bid_logs",
  // CMS Models
  CMSPage: "cms_pages",
  CMSContent: "cms_contents",
  CMSMedia: "cms_media",
  CMSCampaign: "cms_campaigns",
  CMSBanner: "cms_banners",
  CMSFaq: "cms_faqs",
  CMSTaxonomy: "cms_taxonomies",
  CMSRevision: "cms_revisions",
  CMSABTest: "cms_ab_tests",
  CMSAnalytics: "cms_analytics",
  // Automation Models
  Workflow: "workflows",
  WorkflowTrigger: "workflow_triggers",
  WorkflowAction: "workflow_actions",
  WorkflowLog: "workflow_logs",
  AutomationTask: "automation_tasks",
  BusinessRule: "business_rules",
  ApprovalChain: "approval_chains",
  NotificationTemplate: "notification_templates",
  ScheduledJob: "scheduled_jobs",
  // Configuration Models
  ConfigEntry: "config_entries",
  FeatureFlag: "feature_flags",
  ReferenceData: "reference_data",
  VehicleMasterData: "vehicle_master_data",
  LocationMasterData: "location_master_data",
  CountryConfig: "country_configs",
  ConfigAuditLog: "config_audit_logs",
  // Low-Code Platform Models
  BusinessObject: "business_objects",
  ObjectField: "object_fields",
  ObjectRelationship: "object_relationships",
  FormDefinition: "form_definitions",
  ViewDefinition: "view_definitions",
  ObjectPermission: "object_permissions",
  ObjectIndex: "object_indexes",
  ObjectVersion: "object_versions",
  CustomDashboard: "custom_dashboards",
  ObjectData: "object_data",
  // Visual Experience Platform (VXP) Models
  VXPage: "vx_pages",
  VXSection: "vx_sections",
  VXComponent: "vx_components",
  VXTheme: "vx_themes",
  VXLayout: "vx_layouts",
  VXAdvertisement: "vx_advertisements",
  VXCard: "vx_cards",
  VXWidget: "vx_widgets",
  VXVersion: "vx_versions",
  VXStyle: "vx_styles",
  // Experience Orchestration Platform (XOS) Models
  Experience: "experiences",
  Campaign: "campaigns",
  Audience: "audiences",
  Journey: "journeys",
  SeasonalTheme: "seasonal_themes",
  HomepageVariant: "homepage_variants",
  NavigationRule: "navigation_rules",
  ExperienceAnalytics: "experience_analytics",
  // AI Platform Builder Models
  AICommand: "ai_commands",
  AIKnowledge: "ai_knowledge",
  AIConversation: "ai_conversations",
  AIPrompt: "ai_prompts",
  AIWorkspace: "ai_workspaces",
  // Digital Twin Platform Models
  Simulation: "simulations",
  Scenario: "scenarios",
  SimulationResult: "simulation_results",
  Prediction: "predictions",
  // Enterprise Control Plane Models
  PlatformMetric: "platform_metrics",
  Incident: "incidents",
  Alert: "alerts",
  HealthCheck: "health_checks",
  SelfHealingAction: "self_healing_actions",
  // Enterprise Integration Platform Models
  APIEndpoint: "api_endpoints",
  Partner: "partners",
  Webhook: "webhooks",
  Plugin: "plugins",
  IntegrationTemplate: "integration_templates",
  APIKey: "api_keys",
  // Enterprise Governance Platform Models
  GovernancePolicy: "governance_policies",
  ChangeRequest: "change_requests",
  ApprovalRule: "approval_rules",
  FeatureLifecycle: "feature_lifecycles",
  RiskAssessment: "risk_assessments",
  DecisionRegister: "decision_registers",
  EnterpriseStandard: "enterprise_standards",
  CountryRule: "country_rules",
  PartnerRequirement: "partner_requirements",
  Release: "releases",
  // Executive Intelligence Platform Models
  ExecutiveMetric: "executive_metrics",
  IntelligenceReport: "intelligence_reports",
  Forecast: "forecasts",
  Benchmark: "benchmarks",
  // Enterprise Command Center Models
  OperationLog: "operation_logs",
  CommandAction: "command_actions",
  WarRoom: "war_rooms",
  DashboardWidget: "dashboard_widgets",
  // Continuous Improvement Platform Models
  Improvement: "improvements",
  Experiment: "experiments",
  ProductHealth: "product_health",
  InnovationIdea: "innovation_ideas",
  // Platform Factory Models
  PlatformProduct: "platform_products",
  PlatformTemplate: "platform_templates",
  PlatformComponent: "platform_components",
  PlatformBrand: "platform_brands",
  // Ghost Checkers Models
  InspectionPackage: "inspection_packages",
  Inspector: "inspectors",
  Inspection: "inspections",
  VehiclePassport: "vehicle_passports",
  // Dealer Platform Models
  DealerProfile: "dealer_profiles",
  DealerSubscription: "dealer_subscriptions",
  DealerAnalytics: "dealer_analytics",
};

// ────────────────────────────────────────────────────────────────
// FIELD-NAME TRANSLATION LAYER
//
// The application code (controllers, models) was originally written
// against the legacy model API while preserving application field naming
// convention (camelCase, and several fields that were simply
// *renamed* along the way — e.g. `brand` vs the real `make` column).
// The actual database is now Postgres/Supabase with snake_case
// columns. Previously NOTHING translated between the two, so any
// filter, sort, or write using a field name that wasn't already
// identical in both places (the common case for anything not a
// single lowercase word) silently failed or errored. This layer
// fixes that centrally, for every model, instead of touching every
// controller.
//
// Two things happen:
//  1. Generic camelCase -> snake_case conversion for anything not
//     explicitly mapped (handles createdAt/created_at,
//     isVerified/is_verified, bodyType/body_type, etc "for free").
//  2. An explicit per-table alias table for real renames that a
//     case-transform can't fix (brand -> make, fuel -> fuel_type,
//     dealer -> dealer_id, etc).
// ────────────────────────────────────────────────────────────────

// field name -> table it relates to, for populate(). Defaults to
// "users" for anything not listed (the overwhelming majority of
// populated fields across this app are person/actor references).
const RELATION_TABLE = {
  car: "cars", vehicle: "cars", carId: "cars", relatedCar: "cars",
  originalCar: "cars", matchedCars: "cars",
  auction: "cars", relatedAuctions: "cars",
  escrow: "escrows", relatedEscrow: "escrows", relatedEscrows: "escrows",
  relatedPayment: "payments",
};

async function runPopulates(table, rowsOrRow, populates, sb) {
  if (!populates || populates.length === 0 || !rowsOrRow) return rowsOrRow;
  const rows = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow];
  if (rows.length === 0) return rowsOrRow;

  for (const { field, select } of populates) {
    const fkColumn = FIELD_ALIASES[table]?.[field]
      || (field.toLowerCase().endsWith("id") ? camelToSnake(field) : `${camelToSnake(field)}_id`);
    const targetTable = RELATION_TABLE[field] || "users";

    const idSet = new Set();
    for (const row of rows) {
      const val = row?.[fkColumn] ?? row?.[field];
      if (Array.isArray(val)) val.forEach((v) => v && idSet.add(v));
      else if (val) idSet.add(val);
    }
    if (idSet.size === 0) continue;

    // Fixed (Final Integration - real data integration): confirmed by
    // reproducing the real failure directly, in two separate layers.
    // First: this previously passed the caller's select string
    // straight through to Supabase's .select() with no field-name
    // mapping at all, unlike every other query path in this file
    // (which all use normalizeSelect). A real request ("column
    // cars.city does not exist") resulted the moment a populate()
    // select list included any app-level field needing real
    // translation (city -> location_city, auctionStatus ->
    // auction_status, etc.). Second: even with correct field names,
    // normalizeSelect() does not itself guarantee "id" is included -
    // and the match-back-to-source-row step below (`byId = new
    // Map(data.map(d => [d.id, ...]))`) structurally requires it, or
    // every row keys under the same `undefined` and can never match.
    // Both gaps were silently caught by this function's own best-
    // effort catch/continue, leaving the raw foreign-key value in
    // place instead of the populated document, with no error ever
    // surfaced to the caller.
    const mappedSelect = select ? normalizeSelect(targetTable, select) : "*";
    const idColumn = mapKeyOut(targetTable, "id");
    const columns = mappedSelect === "*"
      ? "*"
      : Array.from(new Set([idColumn, ...mappedSelect.split(",")])).join(",");
    try {
      const client = sb();
      const { data, error } = await client.from(targetTable).select(columns).in("id", [...idSet]);
      if (error || !data) continue;
      const byId = new Map(data.map((d) => [d.id, mapRowIn(targetTable, d)]));
      for (const row of rows) {
        const val = row?.[fkColumn] ?? row?.[field];
        if (Array.isArray(val)) {
          row[field] = val.map((v) => byId.get(v)).filter(Boolean);
        } else if (val) {
          row[field] = byId.get(val) || row[field];
        }
      }
    } catch { /* population is best-effort; leave the raw FK value in place */ }
  }
  return rowsOrRow;
}

// Strips the app-level fields named in excludeFields (Mongoose's own
// "-field" exclusion syntax, translated by .select() above into a
// real "select everything" query plus this list) from a real row
// before it's returned to the caller - achieving the same real end
// result Mongoose's exclusion syntax produces (e.g. "never send the
// password hash back"), via a mechanism Supabase actually supports.
function stripExcluded(data, excludeFields) {
  if (!data || !excludeFields || excludeFields.length === 0) return data;
  const arr = Array.isArray(data) ? data : [data];
  for (const row of arr) {
    for (const f of excludeFields) delete row[f];
  }
  return data;
}

function wrapDoc(doc, tableName, sb) {
  if (!doc) return null;
  mapRowIn(tableName, doc);
  // Fixed (Final Integration Phase 5 - API/database contract
  // certification): CRITICAL - this function previously called
  // `return Object.defineProperties(doc, {...baseProps})` and exited
  // immediately, before ever reaching the `if (tableName === "users"
  // || tableName === "user_auth")` block below it that defines
  // matchPassword/hashPassword - that entire block was permanently
  // unreachable, dead code. Reproduced the exact real-world
  // consequence directly: every single login attempt, for every
  // user, has been throwing "userAuth.matchPassword is not a
  // function" and returning "Login failed" (500) - login itself was
  // completely broken. This was never caught earlier this session
  // because every other test authenticated by injecting a pre-built
  // req.user directly (matching how real, valid session cookies work
  // once already logged in) rather than exercising the real login()
  // controller itself - this phase's own systematic, endpoint-by-
  // endpoint audit is what surfaced it. Fixed by building the full
  // properties object first (base properties, then the users/
  // user_auth-specific ones merged in when applicable), and calling
  // Object.defineProperties exactly once, at the end.
  const props = {
    _id: { get() { return this.id; }, set(v) { this.id = v; }, enumerable: true, configurable: true },
    save: {
      value: async function () {
        const client = sb();
        const payload = {};
        // Fixed (Final Integration Phase 3 - real auction & bidding
        // integration): found while providing the required "real,
        // persisted bid" evidence for this phase - Car.prototype.
        // save() writes every enumerable field, including isAuction,
        // which maps to has_auction - a real Postgres GENERATED
        // column (auction_status IS DISTINCT FROM 'none'), confirmed
        // directly in this project's own earlier documentation
        // (services/vehicleApi.ts's own BackendCar type comment) and
        // reproduced live ("column \"has_auction\" can only be
        // updated to DEFAULT") tracing why a real bid's own
        // currentBid update wasn't being persisted. Excluded only for
        // the cars table specifically - this is a real, table-
        // specific database constraint, not a general property to
        // skip for every model.
        const tableSkip = tableName === "cars" ? ["isAuction", "has_auction"] : [];
        for (const [k, v] of Object.entries(this)) {
          if (["save", "toObject", "addTimelineEntry", "deleteOne", "_id"].includes(k)) continue;
          if (tableSkip.includes(k)) continue;
          payload[mapKeyOut(tableName, k)] = v;
        }
        const { data, error } = await client.from(tableName).update(payload).eq("id", this.id).select().single();
        if (error) throw error;
        if (data) Object.assign(this, mapRowIn(tableName, data));
        return this;
      },
      writable: true, configurable: true,
    },
    // Added (Final Integration - real data integration): a real
    // Mongoose document instance method (`doc.deleteOne()`, distinct
    // from the model-level `Model.deleteOne(filter)`) that this
    // codebase's own favoriteController.js already correctly calls -
    // confirmed missing by reproducing the exact real error
    // ("existing.deleteOne is not a function") while tracing why the
    // real, already-built favorites toggle endpoint failed end-to-end
    // against a real database. Deletes this specific row by its own
    // id, matching Mongoose's real semantics for this method.
    deleteOne: {
      value: async function () {
        const client = sb();
        const { error } = await client.from(tableName).delete().eq("id", this.id);
        if (error) throw error;
        return this;
      },
      writable: true, configurable: true,
    },
    // Generic Mongoose-style instance method used by disputeController.js
    // (and available to any other model) — appends a timestamped entry
    // to an in-memory `timeline` array. It does NOT save on its own;
    // every real call site mutates the document then calls .save()
    // once afterward, exactly like Mongoose's typical pattern.
    addTimelineEntry: {
      value: function (entry) {
        if (!Array.isArray(this.timeline)) this.timeline = [];
        this.timeline.push({ ...entry, at: new Date().toISOString() });
        return this;
      },
      writable: true, configurable: true,
    },
    toObject: {
      value: function () { return { ...this }; },
      writable: true, configurable: true,
    },
  };

  if (tableName === "users" || tableName === "user_auth") {
    props.matchPassword = {
      value: async function (candidatePassword) {
        if (!this.password || !candidatePassword) return false;
        return bcrypt.compare(candidatePassword, this.password);
      },
      writable: true, configurable: true,
    };
    props.hashPassword = {
      value: async function () {
        if (this.password && !this.password.startsWith("$2")) {
          this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
        }
      },
      writable: true, configurable: true,
    };
  }

  return Object.defineProperties(doc, props);
}

function createQuery(tableName) {
  const sb = () => getSupabase();
  return {
    _select: "*",
    _lean: false,
    _filters: {},
    _sort: null,
    _limit: null,
    _skip: null,
    _findById: null,
    _populates: [],
    _executor: null,

    select(fields) {
      // Fixed (Final Integration Phase 7 - real end-to-end workflow
      // certification): reproduced directly, tracing the real GET
      // /api/auth/me endpoint - the real session-restoration call
      // this entire platform depends on to keep a user logged in
      // across a refresh - failing with a real Postgres/PostgREST
      // error ("failed to parse select parameter (id,-password)").
      // normalizeSelect() only ever stripped Mongoose's "+field"
      // inclusion prefix; it never handled "-field" exclusion syntax
      // (used here to mean "every column except password") at all -
      // the literal string "-password" was being sent to Supabase's
      // own .select(), which has no concept of field exclusion and
      // rejects it outright. This was a real, pre-existing defect
      // independent of this file's own earlier fix (which guarantees
      // "id" is included) - not introduced by it. Detected here,
      // before reaching normalizeSelect: an exclusion-only select
      // (every requested field starts with "-") is translated to a
      // real "select everything" query, with the excluded field
      // names recorded on the query so the executor can strip them
      // from the result afterward - the same real end result
      // Mongoose's own "-field" syntax produces, achieved through a
      // method Supabase actually supports.
      if (typeof fields === "string" && fields.trim().length > 0) {
        const tokens = fields.trim().split(/\s+/);
        if (tokens.every((t) => t.startsWith("-"))) {
          this._excludeFields = tokens.map((t) => t.slice(1));
          this._select = "*";
          return this;
        }
      }
      const mapped = normalizeSelect(tableName, fields);
      const idColumn = mapKeyOut(tableName, "id");
      this._select = mapped === "*" || mapped.split(",").includes(idColumn)
        ? mapped
        : `${idColumn},${mapped}`;
      return this;
    },

    lean() {
      this._lean = true;
      return this;
    },

    sort(spec) {
      this._sort = spec;
      return this;
    },

    limit(n) {
      this._limit = n;
      return this;
    },

    skip(n) {
      this._skip = n;
      return this;
    },

    where(filters) {
      this._filters = { ...this._filters, ...filters };
      return this;
    },

    distinct(field) {
      return this._executor().then(rows => [...new Set(rows.map(r => r[field]).filter(Boolean))]);
    },

    populate(field, select) {
      if (!field) return this;
      // Two Mongoose populate forms are used across this codebase:
      // .populate("fieldA fieldB") — space-separated multi-field
      // shorthand — and .populate({ path: "field", select: "..." }).
      // Previously only a single plain field name was handled, so
      // both of these silently populated nothing.
      if (typeof field === "object" && field !== null) {
        if (field.path) this._populates.push({ field: field.path, select: field.select });
        return this;
      }
      const fields = String(field).trim().split(/\s+/);
      for (const f of fields) this._populates.push({ field: f, select });
      return this;
    },

    then(resolve, reject) {
      return this._executor().then(resolve, reject);
    },

    catch(reject) {
      return this._executor().then(undefined, reject);
    },

    finally(handler) {
      return this._executor().finally(handler);
    },

  };
}

export function createModel(name) {
  const table = TABLE_MAP[name] || name.toLowerCase();
  const sb = () => getSupabase();

  function buildWhere(supabaseQuery, filters) {
    let q = supabaseQuery;
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null) continue;

      if (k === "$text") {
        const term = v?.$search;
        const fields = SEARCHABLE_FIELDS[table];
        if (term && fields?.length) {
          const orExpr = fields.map((f) => `${f}.ilike.*${term.replace(/[,%]/g, "")}*`).join(",");
          q = q.or(orExpr);
        }
        continue;
      }

      if (k === "$or") {
        const orExpr = v.map((cond) =>
          Object.entries(cond).map(([fk, fv]) => {
            const col = mapKeyOut(table, fk);
            if (fv && typeof fv === "object" && fv.$regex) {
              const term = (fv.$regex.source || fv.$regex).toString().replace(/[,%^$]/g, "");
              return `${col}.ilike.*${term}*`;
            }
            return `${col}.eq.${fv}`;
          }).join(",")
        ).join(",");
        q = q.or(orExpr);
        continue;
      }

      if (k === "$and") {
        for (const cond of v) {
          for (const [fk, fv] of Object.entries(cond)) q = q.eq(mapKeyOut(table, fk), fv);
        }
        continue;
      }

      if (k.startsWith("$")) continue;

      const col = mapKeyOut(table, k);

      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        // Fixed (Phase 12 - E2E environment work): confirmed directly
        // by actually running the real backend against a real
        // database - a Date object passed as $gte/$lte/$gt/$lt (e.g.
        // utils/auctionTimer.js's own auctionEnd: { $lte: now }, now =
        // new Date()) was forwarded to supabase-js's .gte()/.lte()
        // as-is. Those methods stringify a raw Date with JS's own
        // default Date.toString() ("Thu Aug 27 2026 13:48:22 GMT..."),
        // which Postgres/PostgREST rejects outright (error 22007,
        // "invalid input syntax for type timestamp"). Reproduced this
        // exact failure on every 5s tick of the real auction-closing
        // sweep - it has been silently unable to find or close any
        // expiring auction in this environment. Normalized to ISO
        // 8601 (Date.toISOString()), which Postgres accepts.
        const toComparable = (val) => (val instanceof Date ? val.toISOString() : val);
        if (v.$gte !== undefined) q = q.gte(col, toComparable(v.$gte));
        if (v.$lte !== undefined) q = q.lte(col, toComparable(v.$lte));
        if (v.$gt !== undefined) q = q.gt(col, toComparable(v.$gt));
        if (v.$lt !== undefined) q = q.lt(col, toComparable(v.$lt));
        if (v.$ne !== undefined) q = q.neq(col, v.$ne);
        if (v.$in !== undefined) q = q.in(col, v.$in);
        if (v.$nin !== undefined) q = q.not(col, "in", `(${v.$nin.join(",")})`);
        if (v.$regex !== undefined) {
          const term = (v.$regex.source || v.$regex).toString().replace(/[\^$]/g, "");
          q = q.ilike(col, `%${term}%`);
        }
      } else {
        q = q.eq(col, v);
      }
    }
    return q;
  }

  const model = {
    table,

    find(filters = {}) {
      const sel = typeof filters === "object" && !Array.isArray(filters) ? { ...filters } : {};
      const q = createQuery(table);
      q._filters = sel;
      q._executor = async () => {
        const client = sb();
        let query = client.from(table).select(q._select);
        query = buildWhere(query, q._filters);
        if (q._sort) {
          for (const [k, dir] of Object.entries(q._sort)) {
            query = query.order(mapKeyOut(table, k), { ascending: dir === 1 });
          }
        }
        if (q._limit) query = query.limit(q._limit);
        if (q._skip) query = query.range(q._skip, q._skip + (q._limit || 1000) - 1);
        const { data, error } = await query;
        if (error) throw error;
        stripExcluded(data, q._excludeFields);
        const rows = (data || []).map((d) => q._lean ? mapRowIn(table, d) : wrapDoc(d, table, sb));
        await runPopulates(table, rows, q._populates, sb);
        return rows;
      };
      return q;
    },

    findById(id) {
      const q = createQuery(table);
      q._findById = id;
      q._executor = async () => {
        if (!q._findById) return null;
        const client = sb();
        const { data, error } = await client.from(table).select(q._select).eq("id", q._findById).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        stripExcluded(data, q._excludeFields);
        const row = q._lean ? mapRowIn(table, data) : wrapDoc(data, table, sb);
        await runPopulates(table, row, q._populates, sb);
        return row;
      };
      return q;
    },

    findOne(filters = {}) {
      const q = createQuery(table);
      q._filters = { ...filters };
      q._executor = async () => {
        const client = sb();
        let query = client.from(table).select(q._select).limit(1);
        query = buildWhere(query, q._filters);
        const { data, error } = await query;
        if (error) throw error;
        const doc = data?.[0] || null;
        if (!doc) return null;
        stripExcluded(doc, q._excludeFields);
        const row = q._lean ? mapRowIn(table, doc) : wrapDoc(doc, table, sb);
        await runPopulates(table, row, q._populates, sb);
        return row;
      };
      return q;
    },

    async create(data) {
      // Fixed (Final Integration - real data integration): this
      // previously only handled the plain-object Mongoose signature
      // (Model.create({...})) - the array-wrapped signature
      // (Model.create([{...}]), used for Mongoose's session-transaction
      // form and confirmed present in this codebase's own
      // favoriteController.js and bidController.js) was silently
      // mishandled: Object.entries() on an array treats the array's
      // own numeric index as a "column name," producing a real,
      // reproduced Postgres error ("Could not find the '0' column").
      // Mongoose itself supports both forms (array form returns an
      // array of created docs) - this now does too, rather than
      // requiring every real caller using the array form to be
      // rewritten individually.
      const isArrayForm = Array.isArray(data);
      const client = sb();
      if (isArrayForm) {
        const payloads = data.map((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [mapKeyOut(table, k), v])));
        const { data: created, error } = await client.from(table).insert(payloads).select();
        if (error) throw error;
        return (created || []).map((row) => wrapDoc(row, table, sb));
      }
      const payload = Object.fromEntries(Object.entries(data).map(([k, v]) => [mapKeyOut(table, k), v]));
      const { data: created, error } = await client.from(table).insert(payload).select().single();
      if (error) throw error;
      return wrapDoc(created, table, sb);
    },

    async findByIdAndUpdate(id, update, options = {}) {
      if (!id) return null;
      const client = sb();
      let updateData = {};
      if (update.$set) updateData = { ...updateData, ...update.$set };
      if (update.$inc) {
        const current = await model.findById(id);
        if (current) {
          for (const [k, v] of Object.entries(update.$inc)) {
            updateData[k] = (current[k] || 0) + v;
          }
        }
      }
      if (update.$push) {
        const current = await model.findById(id);
        if (current) {
          for (const [k, v] of Object.entries(update.$push)) {
            updateData[k] = [...(current[k] || []), v];
          }
        }
      }
      if (update.$pull) {
        const current = await model.findById(id);
        if (current) {
          for (const [k, v] of Object.entries(update.$pull)) {
            updateData[k] = (current[k] || []).filter((item) => String(item) !== String(v));
          }
        }
      }
      for (const [k, v] of Object.entries(update)) {
        if (!k.startsWith("$")) updateData[k] = v;
      }
      if (Object.keys(updateData).length === 0) return await model.findById(id);
      const payload = Object.fromEntries(Object.entries(updateData).map(([k, v]) => [mapKeyOut(table, k), v]));
      const q = client.from(table).update(payload).eq("id", id);
      if (options.new !== false) q.select();
      const { data, error } = await q;
      if (error) throw error;
      const row = options.new !== false ? (Array.isArray(data) ? data?.[0] : data) : null;
      return row ? wrapDoc(row, table, sb) : null;
    },

    async findOneAndUpdate(filter, update, options = {}) {
      // Fixed (Phase 8 - auction/bidding certification): this
      // previously did findOne(filter) then findByIdAndUpdate(id) as
      // two separate operations - not atomic at all, despite being
      // relied on as if it were (see realtime/auctionEngine.js's own
      // "ATOMIC END (PREVENT DUPLICATES)" comment on its own
      // auction-closing call to this exact method). Reproduced
      // directly: two concurrent calls with the identical filter
      // (auctionStatus: "live") both succeeded, both returning the
      // "ended" row - the safety check callers rely on
      // (`if (!updated) continue`) never actually triggers, because
      // the write was never re-checked against the filter at write
      // time, only at the read a moment earlier. Fixed to build one
      // real, atomic UPDATE ... WHERE <full filter> query (reusing
      // buildWhere, the same, already-proven filter-translation logic
      // every read path already uses) - if another caller already
      // changed a field the filter depends on between two calls, this
      // now genuinely affects zero rows and correctly returns null,
      // instead of unconditionally succeeding for whoever happened to
      // read first. Does not attempt to make the $inc/$push/$pull
      // branches below atomic against a concurrent writer (they still
      // read a "current" value first) - out of this phase's specific
      // scope, since the real bug this phase reproduced and every
      // real caller in this codebase (confirmed by search) uses only
      // plain field-value updates, never these operators, with this
      // method.
      if (Object.keys(filter || {}).length === 0) {
        // No filter at all - nothing meaningful to make atomic
        // against; preserve prior behavior exactly (act as an
        // unconditional single-document update) rather than change
        // behavior for a case this phase's bug does not involve.
        const existing = await model.findOne(filter);
        if (!existing) {
          if (options.upsert) return model.create({ ...filter, ...update.$set, ...update });
          return null;
        }
        return model.findByIdAndUpdate(existing.id, update, options);
      }

      const client = sb();
      let updateData = {};
      if (update.$set) updateData = { ...updateData, ...update.$set };
      for (const [k, v] of Object.entries(update)) {
        if (!k.startsWith("$")) updateData[k] = v;
      }

      if (Object.keys(updateData).length === 0 || update.$inc || update.$push || update.$pull) {
        // Falls back to the pre-existing (non-atomic) path only for
        // operators this fix does not cover, or a no-op update -
        // never for the plain-field-update case this phase's real bug
        // and every real caller actually uses.
        const existing = await model.findOne(filter);
        if (!existing) {
          if (options.upsert) return model.create({ ...filter, ...update.$set, ...update });
          return null;
        }
        return model.findByIdAndUpdate(existing.id, update, options);
      }

      const payload = Object.fromEntries(Object.entries(updateData).map(([k, v]) => [mapKeyOut(table, k), v]));
      let q = client.from(table).update(payload);
      q = buildWhere(q, filter);
      // Always select, regardless of options.new - needed to
      // correctly determine whether the update actually affected a
      // row at all (the whole point of this fix), independent of
      // whether the caller wants the updated document returned.
      q = q.select();
      const { data, error } = await q;
      if (error) throw error;

      const row = Array.isArray(data) ? data?.[0] : data;
      if (!row) {
        if (options.upsert) return model.create({ ...filter, ...update.$set, ...update });
        return null;
      }
      return options.new !== false ? wrapDoc(row, table, sb) : null;
    },

    async findByIdAndDelete(id) {
      if (!id) return null;
      const doc = await model.findById(id);
      if (!doc) return null;
      const client = sb();
      const { error } = await client.from(table).delete().eq("id", id);
      if (error) throw error;
      return doc;
    },

    async findOneAndDelete(filter) {
      const doc = await model.findOne(filter);
      if (!doc) return null;
      return model.findByIdAndDelete(doc.id);
    },

    async deleteMany(filters = {}) {
      const client = sb();
      let q = client.from(table).delete();
      for (const [k, v] of Object.entries(filters)) {
        if (v === undefined) continue;
        const col = mapKeyOut(table, k);
        if (typeof v === "object" && v.$in) q = q.in(col, v.$in);
        else q = q.eq(col, v);
      }
      const { error, count } = await q;
      if (error) throw error;
      return { deletedCount: count || 0 };
    },

    async updateMany(filters = {}, update) {
      const docs = await model.find(filters);
      if (docs.length === 0) return { modifiedCount: 0 };
      const ids = docs.map((d) => d.id);
      const client = sb();
      let updateData = {};
      if (update.$set) updateData = { ...update.$set };
      if (update.$inc) {
        for (const doc of docs) {
          for (const [k, v] of Object.entries(update.$inc)) {
            updateData[k] = (doc[k] || 0) + v;
          }
        }
      }
      const payload = Object.fromEntries(Object.entries(updateData).map(([k, v]) => [mapKeyOut(table, k), v]));
      const { error } = await client.from(table).update(payload).in("id", ids);
      if (error) throw error;
      return { modifiedCount: ids.length };
    },

    async countDocuments(filters = {}) {
      const client = sb();
      let q = client.from(table).select("*", { count: "exact", head: true });
      q = buildWhere(q, filters);
      const { count: c, error } = await q;
      if (error) throw error;
      return c || 0;
    },

    async insertMany(docs) {
      const client = sb();
      const payload = docs.map((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [mapKeyOut(table, k), v])));
      const { data, error } = await client.from(table).insert(payload).select();
      if (error) throw error;
      return (data || []).map((d) => mapRowIn(table, d));
    },

    async distinct(field, filters = {}) {
      const docs = await model.find(filters);
      return [...new Set(docs.map((d) => d[field]).filter(Boolean))];
    },

    async aggregate(pipeline) {
      const docs = await model.find({});
      let result = docs;
      for (const stage of pipeline) {
        if (stage.$match) {
          result = result.filter((d) => {
            for (const [k, v] of Object.entries(stage.$match)) {
              if (typeof v === "object" && v.$gte && d[k] < v.$gte) return false;
              if (typeof v === "object" && v.$lte && d[k] > v.$lte) return false;
              if (typeof v === "object" && v.$ne && d[k] === v.$ne) return false;
              if (typeof v === "object" && v.$in && !v.$in.includes(d[k])) return false;
              if (d[k] !== v) return false;
            }
            return true;
          });
        } else if (stage.$group) {
          const grouped = {};
          for (const d of result) {
            const groupField = typeof stage.$group._id === "string" ? stage.$group._id.replace("$", "") : null;
            const key = groupField ? d[groupField] : null;
            // Accumulator fields (count, sum, avg, etc.) are populated
            // entirely by the loop below, driven by whatever the
            // caller's $group actually asked for — no implicit
            // "count" is auto-added here. It used to unconditionally
            // increment a hardcoded `count` field AND let the $sum:1
            // logic below increment the same field again, silently
            // doubling every grouped count across every admin
            // analytics endpoint that uses the standard
            // `{ count: { $sum: 1 } }` pattern (fraud stats, dispute
            // stats, audit logs, and more).
            if (!grouped[key]) grouped[key] = { _id: key };
            for (const [k, v] of Object.entries(stage.$group)) {
              if (k === "_id") continue;
              if (v.$sum === 1) grouped[key][k] = (grouped[key][k] || 0) + 1;
              else if (v.$sum) grouped[key][k] = (grouped[key][k] || 0) + (d[v.$sum.replace("$", "")] || 0);
              else if (v.$avg) {
                if (!grouped[key]._avgCount) grouped[key]._avgCount = 0;
                if (!grouped[key]._avgSum) grouped[key]._avgSum = 0;
                grouped[key]._avgCount++;
                grouped[key]._avgSum += d[v.$avg.replace("$", "")] || 0;
                grouped[key][k] = grouped[key]._avgSum / grouped[key]._avgCount;
              }
            }
          }
          result = Object.values(grouped);
        } else if (stage.$sort) {
          const [key, dir] = Object.entries(stage.$sort)[0];
          result.sort((a, b) => (dir === -1 ? b[key] - a[key] : a[key] - b[key]));
        } else if (stage.$limit) {
          result = result.slice(0, stage.$limit);
        } else if (stage.$skip) {
          result = result.slice(stage.$skip);
        }
      }
      return result;
    },
  };

  return model;
}
