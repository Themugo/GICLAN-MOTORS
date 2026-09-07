// backend/server.js — PRODUCTION HARDENED v3.0
// =============================================
// Security: mongoSanitize + XSS + IP whitelist + pagination cap
// Monitoring: Sentry (env-driven) + health checks
// Caching: Redis (env-driven, falls back to memory)
// Reliability: escrow auto-release cron + graceful shutdown
// =============================================

import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import session from "express-session";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// ─── Rate Limiters (from middleware) ───────────────────────────
import { globalLimiter, authLimiter, adminLimiter, webhookLimiter, socketRateLimit } from "./middleware/rateLimiter.js";

// ─── Security Middleware ───────────────────────────────────────
import { mongoSanitize as sanitizeInput, xssProtection, paginationCap, extraHeaders, bodyGuard, hppProtection } from "./middleware/security.js";
import { mpesaIpWhitelist, validateMpesaCallback } from "./middleware/mpesaSecurity.js";
import { checkSystemStatus } from "./middleware/systemCheck.js";
import { csrfProtection, csrfToken } from "./middleware/csrf.js";
import { idempotencyCheck } from "./middleware/idempotency.js";
import { protect, adminOnly } from "./middleware/auth.js";
import responseWrapper from "./middleware/responseWrapper.js";
import { performanceMonitor, memoryMonitor, cpuMonitor } from "./middleware/performanceMonitor.js";
import sliMiddleware from "./middleware/sliMiddleware.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { initSupabase, isSupabaseConnected } from "./utils/supabase.js";

// ─── Routes ───────────────────────────────────────────────────
import authRoutes from "./routes/authRoutes.js";
import carRoutes from "./routes/carRoutes.js";
import valuationRoutes from "./routes/valuationRoutes.js";
import bidRoutes from "./routes/bidRoutes.js";
import dealerRoutes from "./routes/dealerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import escrowRoutes from "./routes/escrowRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import auctionAdminRoutes from "./routes/auctionAdminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import savedSearchRoutes from "./routes/savedSearchRoutes.js";
import ntsaVerificationRoutes from "./routes/ntsaVerificationRoutes.js";
import inspectionRoutes from "./routes/inspectionRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import securityLogRoutes from "./routes/securityLogRoutes.js";
import smsBiddingRoutes from "./routes/smsBiddingRoutes.js";
import inspectorApplicationRoutes from "./routes/inspectorApplicationRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import conversionFunnelRoutes from "./routes/conversionFunnelRoutes.js";
import disputeRoutes from "./routes/disputeRoutes.js";
import { startDisputeCron } from "./services/disputeCron.js";
import fraudRoutes from "./routes/fraudRoutes.js";
import operationsRoutes from "./routes/operationsRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import executiveAnalyticsRoutes from "./routes/executiveAnalyticsRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import listingAssistantRoutes from "./routes/listingAssistantRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import duplicateRoutes from "./routes/duplicateRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import dealerHealthScoreRoutes from "./routes/dealerHealthScoreRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import vehicleAnalyticsRoutes from "./routes/vehicleAnalyticsRoutes.js";
import marketplaceHealthRoutes from "./routes/marketplaceHealthRoutes.js";
import featureFlagRoutes from "./routes/featureFlagRoutes.js";
import searchAnalyticsRoutes from "./routes/searchAnalyticsRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import listingQualityRoutes from "./routes/listingQualityRoutes.js";
import notificationAnalyticsRoutes from "./routes/notificationAnalyticsRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import seoRoutes from "./routes/seoRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import prometheusMetricsRoutes from "./routes/prometheusMetrics.js";
import reconciliationRoutes from "./routes/reconciliationRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";
import operationsDashboardRoutes from "./routes/operationsDashboardRoutes.js";
import supportDashboardRoutes from "./routes/supportDashboardRoutes.js";
import salesDashboardRoutes from "./routes/salesDashboardRoutes.js";
import v1Routes from "./routes/v1.js";
import v2Routes from "./routes/v2.js";
import reliabilityRoutes from "./routes/reliabilityRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import auctionIntegrityRoutes from "./routes/auctionIntegrityRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import supportTicketAdminRoutes from "./routes/supportTicketAdminRoutes.js";
import bulkAdminRoutes from "./routes/bulkAdminRoutes.js";
import cmsRoutes from "./routes/cmsRoutes.js";
import adSlotRoutes from "./routes/adSlotRoutes.js";
import heroSlideRoutes from "./routes/heroSlideRoutes.js";
import loanApplicationRoutes from "./routes/loanApplicationRoutes.js";
import automationRoutes from "./routes/automationRoutes.js";
import configurationRoutes from "./routes/configurationRoutes.js";
import lowCodeRoutes from "./routes/lowCodeRoutes.js";
import vxpRoutes from "./routes/vxpRoutes.js";
import xosRoutes from "./routes/xosRoutes.js";
import aiPlatformRoutes from "./routes/aiPlatformRoutes.js";
import digitalTwinRoutes from "./routes/digitalTwinRoutes.js";
import ecpRoutes from "./routes/ecpRoutes.js";
import eipRoutes from "./routes/eipRoutes.js";
import governanceRoutes from "./routes/governanceRoutes.js";
import intelligenceRoutes from "./routes/intelligenceRoutes.js";
import commandCenterRoutes from "./routes/commandCenterRoutes.js";
import improvementRoutes from "./routes/improvementRoutes.js";
import platformFactoryRoutes from "./routes/platformFactoryRoutes.js";
import ghostCheckersRoutes from "./routes/ghostCheckersRoutes.js";
import dealerPlatformRoutes from "./routes/dealerPlatformRoutes.js";
import regionalConfigurationRoutes from "./routes/regionalConfigurationRoutes.js";
import aiDecisionRoutes from "./routes/aiDecisionRoutes.js";
import { startIntegrityCron } from "./services/auctionIntegrityCron.js";
import { startVerificationDeadlineCron } from "./services/deadlineService.js";

// ─── Error Middleware ──────────────────────────────────────────
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

// ─── Sentry Error Handler ───────────────────────────────────────
import * as Sentry from "@sentry/node";

// ─── Services & Utils ─────────────────────────────────────────
import requestLogger from "./middleware/logger.js";
import { logInfo, logWarn, logError, logDebug } from "./utils/logger.js";
import { startAuctionTimer } from "./utils/auctionTimer.js";
import { startEscrowCron } from "./services/escrowCron.js";
import { startAuctionReminderCron } from "./services/auctionReminderCron.js";
import { startSavedSearchCron } from "./services/savedSearchCron.js";
import { startPriceAlertCron } from "./services/priceAlertCron.js";
import { startScheduler as startHealthScoreScheduler } from "./services/dealerHealthScoreScheduler.js";
import { startScheduler as startMarketTrendScheduler } from "./services/marketTrendScheduler.js";
import { startScheduler as startMarketplaceHealthScheduler } from "./services/marketplaceHealthScheduler.js";
import { startSliScheduler } from "./services/sliScheduler.js";
import { startAllReconciliationCrons } from "./services/reconciliationCron.js";
import { startAllWorkers } from "./infrastructure/queues/workerManager.js";
import { initializeQueues } from "./infrastructure/queues/index.js";
import { initPostHog } from "./utils/posthog.js";
import { initCache } from "./utils/cache.js";
import { registerHealthRoutes } from "./utils/healthCheck.js";
import { getEnv, validateEnv } from "./utils/env.js";
import { isRedisConnected } from "./utils/cache.js";
import redisClient from "./config/redis.js";
import { initSentry } from "./config/sentry.js";
import { initOpenTelemetry } from "./config/opentelemetry.js";
import { triggerAlert, ALERT_LEVELS } from "./config/alerting.js";
import { recordHttpRequest, recordError } from "./config/metrics.js";
const getRedisClient = () => redisClient;
import { setIO } from "./utils/io.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config({ path: resolve(__dirname, ".env") });

// =============================
// 🔧 ENVIRONMENT VALIDATION
// =============================
try {
  validateEnv();
  console.log("✅ Environment variables validated");
} catch (err) {
  console.error("❌ Environment validation failed:", err.message);
  process.exit(1);
}

// =============================
// 🔧 SENTRY INITIALIZATION
// =============================
initSentry();

// =============================
// 🔧 OPENTELEMETRY INITIALIZATION
// =============================
initOpenTelemetry();

// ─── CONFIG ───────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "production";
const IS_DEVELOPMENT = NODE_ENV === "development";
const IS_TEST = NODE_ENV === "test";
const FRONTEND = process.env.FRONTEND_URL || (IS_DEVELOPMENT ? "http://localhost:3000" : "");
const parseOriginHostname = (origin) => {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
};
const FRONTEND_HOSTNAME = parseOriginHostname(FRONTEND);

// ─── POSTHOG ──────────────────────────────────────────────────
await initPostHog();

// ─── TRUST PROXY ──────────────────────────────────────────────
app.set("trust proxy", 1);

// ─── SECURITY HEADERS ─────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Removed 'unsafe-inline' for better security. 
        // For inline scripts/styles, implement nonce-based CSP in future
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "blob:"],
        connectSrc: [
          "'self'",
          FRONTEND,
          ...(FRONTEND_HOSTNAME ? [`wss://${FRONTEND_HOSTNAME}`] : []),
          "https://us.i.posthog.com",
          "https://app.posthog.com",
        ],
        fontSrc: ["'self'", "data:"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
        // Additional security directives
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        frameSrc: ["'none'"],
        // Upgrade HTTP to HTTPS
        upgradeInsecureRequests: [],
      },
      // Enable CSP report-only mode in development for testing
      reportOnly: IS_DEVELOPMENT || IS_TEST,
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Additional security headers
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  }),
);

// Permissions-Policy — restrict browser features
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=(self)");
  next();
});

app.use(extraHeaders());

// ─── REQUEST LOGGER (assigns requestId to every request) ──────
app.use(requestLogger);

// ─── REQUEST METRICS MIDDLEWARE
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    recordHttpRequest(req.method, req.path, res.statusCode, duration);
  });
  next();
});

// ─── PERFORMANCE MONITORING MIDDLEWARE
app.use(performanceMonitor);
app.use(memoryMonitor);
app.use(cpuMonitor);

// ─── SENTRY REQUEST HANDLER
// Note: In newer Sentry versions, handlers are auto-instrumented
if (Sentry.Handlers && Sentry.Handlers.requestHandler) {
  app.use(Sentry.Handlers.requestHandler());
}
if (Sentry.Handlers && Sentry.Handlers.tracingHandler) {
  app.use(Sentry.Handlers.tracingHandler());
}

// ─── HTTP LOGGING ────────────────────────────────────────────
if (NODE_ENV === "development") app.use(morgan("dev"));
if (NODE_ENV === "production") {
  app.use(
    morgan("combined", {
      skip: (req) => req.url === "/health" || req.url === "/health/deep",
    }),
  );
}

// ─── RATE LIMITING ────────────────────────────────────────────
app.use(globalLimiter);

// ─── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  FRONTEND,
  ...(FRONTEND_HOSTNAME ? [`https://${FRONTEND_HOSTNAME}`, `https://www.${FRONTEND_HOSTNAME}`] : []),
  ...(process.env.EXTRA_CORS_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  // Add specific Vercel deployment URLs (not wildcard)
  ...(!IS_DEVELOPMENT && !IS_TEST
    ? ["https://kayad-motors.vercel.app", "https://kayad-motors-themugos-projects.vercel.app"]
    : []),
  // Add custom domain if configured
  ...(process.env.CUSTOM_DOMAIN
    ? [process.env.CUSTOM_DOMAIN, `https://www.${process.env.CUSTOM_DOMAIN.replace(/^https?:\/\//, "")}`]
    : []),
];

// Stricter Vercel regex - only allow specific known deployment patterns
const vercelPattern = /^https:\/\/kayad-motors(-themugos-projects)?\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, cb) => {
      // M-6 FIX: Requests with no Origin header should NOT be blindly trusted.
      // In production, only allow non-origin requests (curl, server-to-server) when
      // they don't have credentials. Browser requests always have an Origin header.
      if (!origin) {
        if (!IS_DEVELOPMENT && !IS_TEST) return cb(null, false);
        return cb(null, true);
      }
      
      // Allow all origins in development
      if (IS_DEVELOPMENT || IS_TEST) return cb(null, true);
      
      // Check against explicit allowed origins list
      if (allowedOrigins.includes(origin)) return cb(null, true);
      
      // Check against Vercel pattern (stricter than before)
      if (vercelPattern.test(origin)) return cb(null, true);
      
      // Allow localhost with specific ports only in non-production
      if (IS_DEVELOPMENT || IS_TEST) {
        if (/^https?:\/\/localhost(:3000|:5173|:8080)?$/.test(origin)) return cb(null, true);
      }
      
      logWarn("CORS blocked", { origin, message: "Origin not in allowed list" });
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-By", "X-CSRF-Token", "X-XSRF-Token"],
    maxAge: 600, // Reduced from 86400 to 600 (10 minutes) for better security
  }),
);

// ─── RESPONSE COMPRESSION ─────────────────────────────────────
app.use(compression());

// ─── BODY PARSERS ─────────────────────────────────────────────
app.use(cookieParser());

// ─── SESSION (for CSRF) ─────────────────────────────────────
import CacheStore from "./services/sessionStore.js";
app.use(
  session({
    name: "kayad.sid",
    store: new CacheStore(),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(csrfToken);

// ─── API VERSION DETECTION ───────────────────────────────────
import apiVersionMiddleware from "./middleware/apiVersion.js";
app.use(apiVersionMiddleware);
app.use(bodyGuard());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ─── REQUEST TIMEOUTS ───────────────────────────────────────────
// Import operation-specific timeout middleware
import { mediumTimeout, fastTimeout, externalTimeout, uploadTimeout } from "./middleware/timeout.js";

// Apply default medium timeout to all routes (can be overridden per route)
app.use(mediumTimeout);
// Serve uploaded files with strict headers to prevent script execution
app.use(
  "/uploads",
  (req, res, next) => {
    const ext = req.path.split(".").pop()?.toLowerCase();
    const allowedExts = ["jpg", "jpeg", "png", "webp"];
    if (!allowedExts.includes(ext)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "inline"); // prevent download-as-script attacks
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    next();
  },
  express.static("uploads"),
);

// ─── SECURITY SANITIZATION ───────────────────────────────────
app.use(sanitizeInput()); // Block injection attacks
app.use(xssProtection()); // Sanitize XSS in inputs
app.use(hppProtection()); // Block HTTP parameter pollution
app.use(paginationCap()); // Cap ?limit and ?page params

// ─── SLI CAPTURE (per-request latency, status, error tracking) ──
app.use(sliMiddleware);

// ─── HEALTH CHECKS (before other routes, no auth) ────────────
registerHealthRoutes(app);

// ─── METRICS (Issue #7: time-windowed to prevent memory leak) ──
const metrics = { requests: 0, windowStart: Date.now(), startedAt: Date.now() };
const METRICS_WINDOW_MS = 3600000; // Reset request count every hour

app.use((req, res, next) => {
  const now = Date.now();
  if (now - metrics.windowStart > METRICS_WINDOW_MS) {
    metrics.requests = 0;
    metrics.windowStart = now;
  }
  metrics.requests++;
  next();
});
app.get("/metrics", protect, adminOnly, (req, res) => {
  res.json({
    uptime: Math.round((Date.now() - metrics.startedAt) / 1000),
    requestsThisHour: metrics.requests,
    windowStartedAt: new Date(metrics.windowStart).toISOString(),
    redis: isRedisConnected() ? "connected" : "disabled",
    env: NODE_ENV,
    memory: process.memoryUsage(),
    ts: new Date().toISOString(),
  });
});

// ─── API DOCS ─────────────────────────────────────────────────
if (IS_DEVELOPMENT || IS_TEST) {
  // Open access only in explicitly non-production environments
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "KAYAD API Docs",
    }),
  );
} else {
  // Require admin auth in production
  app.use(
    "/api-docs",
    protect,
    adminOnly,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "KAYAD API Docs",
    }),
  );
}

// ─── API ROUTES (VERSIONED) ───────────────────────────────────
app.use("/api/v2", v2Routes);

// ─── DASHBOARD ROUTES (ROLE-BASED) ───────────────────────────
app.use("/api/v1/analytics/operations", operationsDashboardRoutes);
app.use("/api/v1/analytics/support", supportDashboardRoutes);
app.use("/api/v1/analytics/sales", salesDashboardRoutes);

// ─── SOCKET.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      // M-6 FIX: Same null-origin fix for Socket.IO.
      if (!origin) {
        if (!IS_DEVELOPMENT && !IS_TEST) return cb(null, false);
        return cb(null, true);
      }
      
      // Allow all origins in development
      if (IS_DEVELOPMENT || IS_TEST) return cb(null, true);
      
      // Check against explicit allowed origins list
      if (allowedOrigins.includes(origin)) return cb(null, true);
      
      // Check against Vercel pattern (stricter than before)
      if (vercelPattern.test(origin)) return cb(null, true);
      
      // Allow localhost with specific ports only in non-production
      if (IS_DEVELOPMENT || IS_TEST) {
        if (/^https?:\/\/localhost(:3000|:5173|:8080)?$/.test(origin)) return cb(null, true);
      }
      
      logWarn("Socket CORS blocked", { origin, message: "Origin not in allowed list" });
      cb(new Error(`Socket CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  // Additional security settings
  maxHttpBufferSize: 1e6, // 1MB max message size
  allowRequest: (req, callback) => {
    // Additional request validation can be added here
    callback(null, true);
  },
});

app.set("io", io);
setIO(io);

// Socket JWT auth — reject unauthenticated users for sensitive rooms
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      socket.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
      return next();
    }
    // Allow unauthenticated viewers for public auction watching only
    socket.user = null;
    next();
  } catch {
    socket.user = null;
    next();
  }
});

// Online presence tracking
const onlineUsers = new Map();

io.on("connection", (socket) => {
  const uid = socket.user?.id || socket.user?._id;
  if (uid) {
    socket.join(`user_${uid}`);
    onlineUsers.set(uid, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  }

  // Validate room IDs to prevent arbitrary room injection
  const isValidId = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Issue #8: Per-socket event rate limiter (max 10 events per 10 seconds)
  const eventBuckets = new Map();
  const isRateLimited = (event) => {
    const now = Date.now();
    let bucket = eventBuckets.get(event);
    if (!bucket || now - bucket.windowStart > 10000) {
      bucket = { windowStart: now, count: 0 };
      eventBuckets.set(event, bucket);
    }
    bucket.count++;
    return bucket.count > 10;
  };

  socket.on("joinAuction", async (carId) => {
    if (isRateLimited("joinAuction") || !isValidId(carId)) return;

    try {
      const { getSupabase } = await import("./utils/supabase.js");
      const sb = getSupabase();
      const { data: car } = await sb
        .from("cars")
        .select("id, current_bid, auction_end, auction_status")
        .eq("id", carId)
        .maybeSingle();

      // Public auction watching is allowed, but a socket may only join a
      // room for a real vehicle. Do not create arbitrary empty rooms.
      if (!car) return;

      socket.join(String(carId));
      socket.join(`car_${carId}`);
      socket.emit("auctionResync", {
        carId,
        currentBid: car.current_bid,
        auctionEnd: car.auction_end,
        auctionStatus: car.auction_status,
      });
    } catch (error) {
      // Never grant room access when the authorization lookup fails.
      logWarn("Socket auction room authorization failed", { carId, error: error?.message });
    }
  });

  socket.on("joinChat", async (chatId) => {
    if (!socket.user || isRateLimited("joinChat") || !isValidId(chatId)) return;

    const userId = socket.user.id || socket.user._id;
    if (!isValidId(String(userId))) return;

    try {
      const { getSupabase } = await import("./utils/supabase.js");
      const sb = getSupabase();
      const { data: chat } = await sb
        .from("chats")
        .select("id")
        .eq("id", chatId)
        .contains("participants", [userId])
        .maybeSingle();

      // Chat rooms are private. Authentication alone is not sufficient; the
      // authenticated user must actually be a participant in this chat.
      if (!chat) return;
      socket.join(`chat_${chatId}`);
    } catch (error) {
      logWarn("Socket chat room authorization failed", { chatId, userId, error: error?.message });
    }
  });
  socket.on("leaveChat", (chatId) => {
    if (!isRateLimited("leaveChat") && isValidId(chatId)) socket.leave(`chat_${chatId}`);
  });
  socket.on("typing", ({ chatId } = {}) => {
    if (!socket.user || !isRateLimited("typing") || !isValidId(String(chatId || ""))) return;

    // A socket can only type into a room it was authorized to join. Never
    // trust client-supplied userId/name because those values can impersonate
    // another participant.
    const room = `chat_${chatId}`;
    if (!socket.rooms.has(room)) return;

    const userId = socket.user.id || socket.user._id;
    const name = socket.user.name || socket.user.fullName || socket.user.email || null;
    socket.to(room).emit("typing", { chatId, userId, name });
  });
  socket.on("joinAdmin", () => {
    if (socket.user?.role === "admin") socket.join("admins");
  });
  socket.on("joinShowroom", () => {
    if (!isRateLimited("joinShowroom")) socket.join("showroom");
  });
  socket.on("leaveShowroom", () => {
    socket.leave("showroom");
  });
  socket.on("disconnect", () => {
    eventBuckets.clear();
    if (uid) {
      onlineUsers.delete(uid);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    }
  });
});

// ─── RESPONSE WRAPPER (ensures every JSON response has `success` field) ──
app.use(responseWrapper);

// ─── SYSTEM STATUS CHECK (global middleware for protected routes) ──
app.use("/api", checkSystemStatus);
// Enforce CSRF consistently across every browser-facing state-changing API.
// JWT requests remain exempt inside csrfProtection; machine callbacks have an
// explicit allowlist in the middleware and retain their own authentication.
app.use("/api", csrfProtection);

// ─── API ROUTES ───────────────────────────────────────────────
app.use("/api/auth/refresh", csrfProtection); // CSRF for cookie-based refresh
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/valuation", valuationRoutes);
app.use("/api/bids", idempotencyCheck, csrfProtection, bidRoutes); // Idempotency + CSRF for state-changing bid operations
app.use("/api/dealer", dealerRoutes);
app.use("/api/admin", adminLimiter, adminRoutes);

app.use("/api/payments", externalTimeout, paymentRoutes);

app.use("/api/escrow", idempotencyCheck, csrfProtection, escrowRoutes); // Idempotency + CSRF for escrow operations
app.use("/api/chat", chatRoutes);
app.use("/api/favorites", csrfProtection, favoriteRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", csrfProtection, reviewRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/auction-admin", auctionAdminRoutes);
app.use("/api/users", csrfProtection, userRoutes);
app.use("/api/saved-searches", csrfProtection, savedSearchRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/ntsa-verification", ntsaVerificationRoutes);
app.use("/api/inspection", inspectionRoutes);
// Backward-compatible alias for clients using the earlier plural path.
app.use("/api/inspections", inspectionRoutes);
app.use("/api/security-logs", securityLogRoutes);
app.use("/api/sms-bidding", smsBiddingRoutes);
app.use("/api/inspector-applications", inspectorApplicationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/funnel", conversionFunnelRoutes);
app.use("/api/disputes", idempotencyCheck, csrfProtection, disputeRoutes);
app.use("/api/upload", csrfProtection, uploadRoutes);
app.use("/api/fraud", fraudRoutes);
app.use("/api/operations", operationsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/executive-analytics", executiveAnalyticsRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/listing-assistant", listingAssistantRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/ai/decision", aiDecisionRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/duplicates", duplicateRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/dealer-health-score", dealerHealthScoreRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/webhooks", webhookLimiter, webhookRoutes);
app.use("/api/analytics", vehicleAnalyticsRoutes);
app.use("/api/marketplace-health", marketplaceHealthRoutes);
app.use("/api/feature-flags", featureFlagRoutes);
app.use("/api/search-analytics", searchAnalyticsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/listing-quality", listingQualityRoutes);
app.use("/api/notification-analytics", notificationAnalyticsRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/operations-dashboard", adminLimiter, operationsDashboardRoutes);
app.use("/health", fastTimeout, healthRoutes);
app.use("/metrics", fastTimeout, metricsRoutes);
app.use("/prometheus", fastTimeout, prometheusMetricsRoutes);
app.use("/api/admin/queue", adminLimiter, queueRoutes);
app.use("/api/reliability", reliabilityRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/new-admin/auction-integrity", auctionIntegrityRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/admin/support-tickets", supportTicketAdminRoutes);
app.use("/api/admin/bulk", bulkAdminRoutes);
app.use("/api/cms", cmsRoutes);
app.use("/api/ads", adSlotRoutes);
app.use("/api/hero", heroSlideRoutes);
app.use("/api/loans", loanApplicationRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/config", configurationRoutes);
app.use("/api/lowcode", lowCodeRoutes);
app.use("/api/vxp", vxpRoutes);
app.use("/api/xos", xosRoutes);
app.use("/api/ai", aiPlatformRoutes);
app.use("/api/digital-twin", digitalTwinRoutes);
app.use("/api/ecp", ecpRoutes);
app.use("/api/integration", eipRoutes);
app.use("/api/governance", governanceRoutes);
app.use("/api/intelligence", intelligenceRoutes);
app.use("/api/command-center", commandCenterRoutes);
app.use("/api/improvement", improvementRoutes);
app.use("/api/platform-factory", platformFactoryRoutes);
app.use("/api/ghost-checkers", ghostCheckersRoutes);
app.use("/api/dealer-platform", dealerPlatformRoutes);
app.use("/api/countries", regionalConfigurationRoutes);
app.use(seoRoutes);

// ─── API VERSIONING ──────────────────────────────────────────
// /api/v1/* is mounted once, after the compatibility routes below.
// checkSystemStatus is already global under /api, so the versioned mount
// does not need a second copy of that middleware.
app.use("/api/v1/payments/callback", mpesaIpWhitelist, validateMpesaCallback);
app.use("/api/v1", v1Routes);

// ─── ERROR HANDLING ───────────────────────────────────────────
// Note: In newer Sentry versions, handlers are auto-instrumented
if (Sentry.Handlers && Sentry.Handlers.errorHandler) {
  app.use(Sentry.Handlers.errorHandler());
}
app.use(notFound);
app.use(errorHandler);

// ─── DATABASE ─────────────────────────────────────────────────
const connectDB = () => {
  initSupabase();
  if (isSupabaseConnected()) {
    logInfo("Supabase connected");
  } else {
    logWarn("Supabase not configured — running without database");
  }
};



// ─── BACKGROUND SERVICES ────────────────────────────────────
const startBackgroundServices = async (io) => {
  console.log("🔧 Starting background services...");
  await Promise.allSettled([
    (async () => {
      try { startAuctionTimer(io); console.log("✅ Auction timer started"); }
      catch (err) { logError("Failed to start auction timer", err); console.log("❌ Failed to start auction timer:", err); }
    })(),
    (async () => {
      try { startEscrowCron(); console.log("✅ Escrow cron started"); }
      catch (err) { logError("Failed to start escrow cron", err); console.log("❌ Failed to start escrow cron:", err); }
    })(),
    (async () => {
      try { startDisputeCron(); console.log("✅ Dispute cron started"); }
      catch (err) { logError("Failed to start dispute cron", err); console.log("❌ Failed to start dispute cron:", err); }
    })(),
    (async () => {
      try { startAuctionReminderCron(); console.log("✅ Auction reminder cron started"); }
      catch (err) { logError("Failed to start auction reminder cron", err); console.log("❌ Failed to start auction reminder cron:", err); }
    })(),
    (async () => {
      try { startSavedSearchCron(); console.log("✅ Saved search cron started"); }
      catch (err) { logError("Failed to start saved search cron", err); console.log("❌ Failed to start saved search cron:", err); }
    })(),
    (async () => {
      try { startPriceAlertCron(); console.log("✅ Price alert cron started"); }
      catch (err) { logError("Failed to start price alert cron", err); console.log("❌ Failed to start price alert cron:", err); }
    })(),
    (async () => {
      try { startHealthScoreScheduler(); console.log("✅ Health score scheduler started"); }
      catch (err) { logError("Failed to start health score scheduler", err); console.log("❌ Failed to start health score scheduler:", err); }
    })(),
    (async () => {
      try { startMarketTrendScheduler(); console.log("✅ Market trend scheduler started"); }
      catch (err) { logError("Failed to start market trend scheduler", err); console.log("❌ Failed to start market trend scheduler:", err); }
    })(),
    (async () => {
      try { startMarketplaceHealthScheduler(); console.log("✅ Marketplace health scheduler started"); }
      catch (err) { logError("Failed to start marketplace health scheduler", err); console.log("❌ Failed to start marketplace health scheduler:", err); }
    })(),
    (async () => {
      try { startSliScheduler(); console.log("✅ Reliability/SLI scheduler started"); }
      catch (err) { logError("Failed to start SLI scheduler", err); console.log("❌ Failed to start SLI scheduler:", err); }
    })(),
    (async () => {
      try { startAllReconciliationCrons(); console.log("✅ Reconciliation crons started (rapid/hourly/daily/deep)"); }
      catch (err) { logError("Failed to start reconciliation crons", err); console.log("❌ Failed to start reconciliation crons:", err); }
    })(),
    (async () => {
      try { startIntegrityCron(); console.log("✅ Auction integrity cron started"); }
      catch (err) { logError("Failed to start auction integrity cron", err); console.log("❌ Failed to start auction integrity cron:", err); }
      try { startVerificationDeadlineCron(); console.log("✅ Verification deadline cron started"); }
      catch (err) { logError("Failed to start verification deadline cron", err); console.log("❌ Failed to start verification deadline cron:", err); }
    })(),
  ]);

  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
      await initializeQueues();
      console.log("✅ Queue infrastructure initialized");
    } catch (err) {
      logError("Failed to initialize queues", err);
      console.log("⚠️ Queue infrastructure init failed (non-fatal)");
    }
    try {
      startAllWorkers();
      console.log("✅ Background workers started");
    } catch (err) {
      logError("Failed to start workers", err);
      console.log("⚠️ Worker startup failed (non-fatal)");
    }
  } else {
    console.log("⚠️ Redis not configured — queues/workers disabled");
  }

  logInfo("Background services started", {
    escrowCron: `auto-release after ${process.env.ESCROW_AUTO_RELEASE_DAYS || 7} days`,
    auctionReminderCron: "reminders active",
    savedSearchCron: "10-min cycle",
    priceAlertCron: "15-min cycle",
    auctionTimer: "5s close sweep (canonical)",
    sliScheduler: "1-min SLI / 5-min budget / 1-min alerts",
  });

  if (isRedisConnected()) {
    const VIEW_FLUSH_MS = 60000;
    setInterval(async () => {
      try {
        const redis = getRedisClient();
        const counts = await redis.hGetAll("kayad:view_counts");
        const ids = Object.keys(counts);
        if (ids.length === 0) return;
        const { getSupabase } = await import("./utils/supabase.js");
        const sb = getSupabase();
        for (const id of ids) {
          const viewCount = parseInt(counts[id], 10) || 0;
          await sb.rpc("increment_car_views", { car_id: id, increment_by: viewCount });
        }
        await redis.del("kayad:view_counts");
      } catch (e) {
        logWarn("View flush error", { error: e.message });
      }
    }, VIEW_FLUSH_MS);
    logInfo("View flush configured", { interval: "60s", flow: "Redis → PostgreSQL" });
  }
};

// ─── BOOTSTRAP ────────────────────────────────────────────────
const bootstrap = async () => {
  try {
    console.log("🔧 Starting bootstrap process...");
    validateEnv();
    console.log("✅ Environment validated");
    await connectDB();
    console.log("✅ Database connected");

    await initCache();

    // Start listening BEFORE auto-seed so Render detects the open port
    try {
      console.log("🚀 Starting server on port", PORT);
      server.listen(PORT, async () => {
        console.log("✅ Server listening callback triggered");
        logInfo("Kayad API started", {
          url: `http://localhost:${PORT}`,
          env: NODE_ENV,
          cors: FRONTEND,
          routes: "16 + v1 (versioned)",
          security: "mongoSanitize + XSS + IP whitelist + pagination cap",
          posthog: process.env.POSTHOG_API_KEY ? "connected" : "disabled",
          redis: process.env.REDIS_URL ? "connecting..." : "in-memory fallback",
          socket: "ready",
          sentry: process.env.SENTRY_DSN ? "enabled" : "disabled",
          backup: process.env.BACKUP_ENABLED === "true" ? "enabled" : "disabled",
          cardPayment: process.env.CARD_PAYMENT_ENABLED === "true" ? "enabled" : "disabled",
        });

        if (process.env.SENTRY_DSN) {
          await triggerAlert("Server Started", `KAYAD backend server started successfully on port ${PORT}`, ALERT_LEVELS.LOW, { port: PORT, host: "localhost", environment: NODE_ENV });
        }

        await startBackgroundServices(io);
      });
    } catch (listenErr) {
      logError("Failed to start server", listenErr);
      console.log("❌ Failed to start server:", listenErr);
      process.exit(1);
    }
  } catch (err) {
    logError("Bootstrap failed", err);
    process.exit(1);
  }
};

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────
const shutdown = async (signal) => {
  if (shutdown.inProgress) return;
  shutdown.inProgress = true;
  logInfo("Shutting down gracefully", { signal });

  // Trigger shutdown alert
  if (process.env.SENTRY_DSN) {
    await triggerAlert("Server Shutdown", `KAYAD backend server shutting down due to ${signal}`, ALERT_LEVELS.MEDIUM, {
      signal,
    });
  }

  // Stop accepting new HTTP requests
  server.close(async () => {
    logInfo("HTTP server closed");

    try {
      // Close Socket.IO connections
      if (io) {
        io.close();
        logInfo("Socket.IO connections closed");
      }

      // Close queue workers
      const { closeWorkers } = await import("./config/queue.js");
      await closeWorkers();
      logInfo("Queue workers closed");

      // Close dead letter queues
      const { closeDeadLetterQueues } = await import("./config/queue.js");
      await closeDeadLetterQueues();
      logInfo("Dead letter queues closed");

      // Close queues
      const { closeQueues } = await import("./config/queue.js");
      await closeQueues();
      logInfo("Queues closed");

      // Close Redis connection
      const { closeConnection } = await import("./config/queue.js");
      await closeConnection();
      logInfo("Redis connection closed");

      logInfo("Shutdown complete");
      process.exit(0);
    } catch (err) {
      logError("Error during shutdown", err);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logError("Forced shutdown after timeout");
    process.exit(1);
  }, 30_000);
};

if (NODE_ENV !== "test") {
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  // Rejections from per-request or per-job async work are logged and
  // alerted, but must NOT take down the whole server — one bad request
  // killing every other in-flight request is a worse failure mode than
  // the rejection itself. A threshold guards against a process that is
  // genuinely reject-looping (sustained leak): only then do we restart.
  let rejectionBurst = 0;
  let rejectionWindowStart = Date.now();
  const REJECTION_BURST_LIMIT = 25;
  const REJECTION_WINDOW_MS = 60_000;

  process.on("unhandledRejection", async (err) => {
    logError("Unhandled rejection (non-fatal)", err);
    recordError("unhandled_rejection", String(err));

    // Trigger critical alert (rate-limited to avoid alert storms)
    if (process.env.SENTRY_DSN && rejectionBurst === 0) {
      await triggerAlert("Unhandled Rejection", `Unhandled promise rejection: ${String(err)}`, ALERT_LEVELS.CRITICAL, {
        reason: String(err),
      });
    }

    const now = Date.now();
    if (now - rejectionWindowStart > REJECTION_WINDOW_MS) {
      rejectionWindowStart = now;
      rejectionBurst = 0;
    }
    rejectionBurst++;

    if (rejectionBurst > REJECTION_BURST_LIMIT) {
      logError("Unhandled-rejection burst limit exceeded — shutting down for orchestrator restart", null, {
        count: rejectionBurst,
        windowMs: REJECTION_WINDOW_MS,
      });
      shutdown("unhandledRejectionBurst");
    }
  });
  process.on("uncaughtException", async (err) => {
    logError("Uncaught exception", err);
    recordError("uncaught_exception", err.message);

    // Trigger critical alert
    if (process.env.SENTRY_DSN) {
      await triggerAlert("Uncaught Exception", `Uncaught exception: ${err.message}`, ALERT_LEVELS.CRITICAL, {
        error: err.message,
        stack: err.stack,
      });
    }

    process.exit(1);
  });
}

if (NODE_ENV === "test") {
  // Do NOT connect in test mode — tests handle their own DB connection
} else {
  bootstrap();
}

export { app, server, bootstrap };
export default app;
