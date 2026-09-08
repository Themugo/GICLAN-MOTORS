// backend/services/storage.service.js - Unified Storage Interface v1.0
// ─────────────────────────────────────────────────────────────
// Provides unified interface for image storage (Supabase + Cloudinary)
// Falls back gracefully when services are not configured
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🔐 SUPABASE CONFIG
// =============================

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "kayad-images";

// Placeholder values that should be replaced
const PLACEHOLDER_PATTERNS = [
  "placeholder",
  "your-project",
  "your_supabase",
];

const isPlaceholder = (value) => {
  if (!value) return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(p => lower.includes(p));
};

let supabaseClient = null;
let supabaseConnected = false;

const initSupabaseStorage = () => {
  // Check if placeholder values are used
  if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_SERVICE_KEY)) {
    logWarn("Supabase storage not configured — using Cloudinary fallback");
    return false;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logWarn("Supabase storage not configured — set SUPABASE_URL and SUPABASE_SERVICE_KEY");
    return false;
  }

  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
      storage: { abortSignal: undefined },
    });
    supabaseConnected = true;
    logInfo("✅ Supabase storage initialized");
    return true;
  } catch (err) {
    logError("Supabase storage init failed:", err);
    return false;
  }
};

// Initialize on module load
initSupabaseStorage();

// =============================
// 🏗️ IMAGE VARIANTS CONFIG
// =============================

const IMAGE_VARIANTS = {
  original: { width: 0, height: 0 },
  full: { width: 1400, height: 900 },
  card: { width: 600, height: 400 },
  thumb: { width: 300, height: 200 },
  mobile: { width: 320, height: 0 },
  tablet: { width: 768, height: 0 },
  desktop: { width: 1200, height: 0 },
  blur: { width: 20, height: 20 },
};

// =============================
// 📤 UPLOAD TO SUPABASE
// =============================

export const uploadToSupabase = async (file, folder = "cars") => {
  if (!supabaseConnected || !supabaseClient) {
    throw new Error("Supabase storage not available");
  }

  try {
    const timestamp = Date.now();
    const sanitizedName = file.originalname
      ?.replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_");
    const fileName = `${timestamp}-${sanitizedName || "upload"}`;
    const filePath = `${folder}/${fileName}`;

    // Convert buffer to base64 for upload
    const buffer = file.buffer ? Buffer.from(file.buffer) : null;
    if (!buffer) {
      throw new Error("No file data available");
    }

    const { data, error } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(data.path);

    const baseUrl = urlData.publicUrl;

    // Generate variant URLs (Supabase uses transform params)
    const variants = {};
    for (const [name, dims] of Object.entries(IMAGE_VARIANTS)) {
      const params = new URLSearchParams();
      if (dims.width) params.set("width", dims.width.toString());
      if (dims.height) params.set("height", dims.height.toString());
      if (name === "blur") params.set("quality", "10");

      const queryString = params.toString();
      variants[name] = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }

    return {
      public_id: data.path,
      url: baseUrl,
      ...variants,
      format: file.mimetype?.split("/")[1] || "jpg",
      bytes: buffer.length,
      storageId: `supabase:${data.path}`,
      storageProvider: "supabase",
    };
  } catch (err) {
    logError("Supabase upload failed:", err);
    throw err;
  }
};

// =============================
// ❌ DELETE FROM SUPABASE
// =============================

export const deleteFromSupabase = async (publicId) => {
  if (!supabaseConnected || !supabaseClient || !publicId) {
    return;
  }

  try {
    const { error } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .remove([publicId]);

    if (error) {
      logWarn("Supabase delete warning:", error.message);
    }
  } catch (err) {
    logError("Supabase delete failed:", err);
  }
};

// =============================
// 🔍 GET PUBLIC URL
// =============================

export const getSupabasePublicUrl = (path) => {
  if (!supabaseClient) return null;

  const { data } = supabaseClient.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(path);

  return data?.publicUrl || null;
};

// =============================
// 📊 STORAGE STATUS
// =============================

export const isStorageConnected = () => supabaseConnected;

export const getStorageProvider = () =>
  supabaseConnected ? "supabase" : "cloudinary-fallback";

export default {
  uploadToSupabase,
  deleteFromSupabase,
  getSupabasePublicUrl,
  isStorageConnected,
  getStorageProvider,
};
