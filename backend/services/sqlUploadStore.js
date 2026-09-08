import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";

const backendRoot = process.cwd();
const dataDir = path.join(backendRoot, "data");
const uploadsDir = path.join(backendRoot, "uploads");
const jsonDbPath = path.join(dataDir, "uploads.json");

mkdirSync(dataDir, { recursive: true });

let dbInstance = null;
let initialized = false;
let usingJsonFallback = false;

let DatabaseSync = null;
try {
  ({ DatabaseSync } = await import("node:sqlite"));
} catch {
  usingJsonFallback = true;
}

const inMemory = [];

const readJsonDb = () => {
  try {
    if (existsSync(jsonDbPath)) {
      return JSON.parse(readFileSync(jsonDbPath, "utf-8"));
    }
  } catch {}
  return [];
};

const writeJsonDb = (data) => {
  try {
    writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
  } catch {}
};

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".json": "application/json",
  ".csv": "text/csv",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const initializeStore = () => {
  if (initialized && dbInstance) return dbInstance;

  if (usingJsonFallback) {
    const existing = readJsonDb();
    inMemory.push(...existing);
    dbInstance = {
      prepare: () => ({
        get: () => null,
        run: () => ({ changes: 0 }),
        all: () => [],
      }),
      exec: () => {},
    };
    initialized = true;
    return dbInstance;
  }

  const dbPath = path.join(dataDir, "uploads.sqlite");
  dbInstance = new DatabaseSync(dbPath);
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      originalName TEXT,
      mimeType TEXT,
      size INTEGER,
      folder TEXT,
      provider TEXT,
      storagePath TEXT,
      publicId TEXT,
      url TEXT,
      thumb TEXT,
      metadata TEXT,
      createdAt TEXT,
      userId TEXT,
      checksum TEXT,
      content BLOB
    );
  `);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_publicId ON uploads(publicId);`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_folder ON uploads(folder);`);

  initialized = true;
  return dbInstance;
};

const ensureLegacyImport = () => {
  if (!existsSync(uploadsDir)) return;

  if (usingJsonFallback) {
    const existing = readJsonDb();
    const existingPaths = new Set(existing.map((r) => r.storagePath).filter(Boolean));

    if (existingPaths.size > 0) return;

    for (const entry of readdirSync(uploadsDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const absolutePath = path.join(uploadsDir, entry.name);
      const relativePath = path.relative(backendRoot, absolutePath).replace(/\\/g, "/");
      if (existingPaths.has(relativePath)) continue;

      try {
        const buffer = readFileSync(absolutePath);
        const record = {
          id: randomUUID(),
          originalName: entry.name,
          mimeType: MIME_BY_EXT[path.extname(entry.name).toLowerCase()] || "application/octet-stream",
          size: statSync(absolutePath).size,
          folder: "legacy",
          provider: "filesystem",
          storagePath: relativePath,
          url: `/uploads/${entry.name}`,
          thumb: `/uploads/${entry.name}`,
          content: buffer.toString("base64"),
          metadata: JSON.stringify({ importedFrom: "legacy-uploads-directory" }),
          createdAt: new Date().toISOString(),
          checksum: createHash("sha256").update(buffer).digest("hex"),
        };
        existing.push(record);
      } catch {
        console.warn(`Unable to import legacy upload ${entry.name}`);
      }
    }
    writeJsonDb(existing);
    inMemory.length = 0;
    inMemory.push(...existing);
    return;
  }

  const db = initializeStore();
  const existing = new Set(
    db
      .prepare("SELECT storagePath FROM uploads WHERE storagePath IS NOT NULL")
      .all()
      .map((row) => row.storagePath),
  );

  for (const entry of readdirSync(uploadsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const absolutePath = path.join(uploadsDir, entry.name);
    const relativePath = path.relative(backendRoot, absolutePath).replace(/\\/g, "/");
    if (existing.has(relativePath)) continue;

    try {
      const buffer = readFileSync(absolutePath);
      const ext = path.extname(entry.name).toLowerCase();
      const mimeType = MIME_BY_EXT[ext] || "application/octet-stream";
      createUploadRecord({
        originalName: entry.name,
        mimeType,
        size: statSync(absolutePath).size,
        folder: "legacy",
        provider: "filesystem",
        storagePath: relativePath,
        url: `/uploads/${entry.name}`,
        thumb: `/uploads/${entry.name}`,
        content: buffer,
        metadata: { importedFrom: "legacy-uploads-directory" },
      });
    } catch (error) {
      console.warn(`Unable to import legacy upload ${entry.name}: ${error.message}`);
    }
  }
};

export const initializeUploadStore = () => {
  const db = initializeStore();
  ensureLegacyImport();
  return db;
};

export const createUploadRecord = (payload = {}) => {
  const id = payload.id || randomUUID();
  const createdAt = payload.createdAt || new Date().toISOString();
  const content = payload.content ?? null;
  const checksum = content ? createHash("sha256").update(Buffer.isBuffer(content) ? content : Buffer.from(String(content))).digest("hex") : payload.checksum || null;

  if (usingJsonFallback) {
    const record = {
      id,
      originalName: payload.originalName || null,
      mimeType: payload.mimeType || null,
      size: payload.size || null,
      folder: payload.folder || null,
      provider: payload.provider || "cloudinary",
      storagePath: payload.storagePath || null,
      publicId: payload.publicId || null,
      url: payload.url || null,
      thumb: payload.thumb || null,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      createdAt,
      userId: payload.userId || null,
      checksum,
      content: Buffer.isBuffer(content) ? content.toString("base64") : content,
    };
    const all = readJsonDb();
    all.push(record);
    writeJsonDb(all);
    inMemory.length = 0;
    inMemory.push(...all);
    return { id, ...payload, checksum, createdAt };
  }

  const db = initializeStore();
  db.prepare(`
    INSERT INTO uploads (
      id, originalName, mimeType, size, folder, provider,
      storagePath, publicId, url, thumb, metadata,
      createdAt, userId, checksum, content
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.originalName || null,
    payload.mimeType || null,
    payload.size || null,
    payload.folder || null,
    payload.provider || "cloudinary",
    payload.storagePath || null,
    payload.publicId || null,
    payload.url || null,
    payload.thumb || null,
    payload.metadata ? JSON.stringify(payload.metadata) : null,
    createdAt,
    payload.userId || null,
    checksum,
    content,
  );

  return { id, ...payload, checksum, createdAt };
};

export const getUploadRecord = (id) => {
  if (usingJsonFallback) {
    const all = readJsonDb();
    const record = all.find((r) => r.id === id);
    if (!record) return null;
    return { ...record, content: record.content ? Buffer.from(record.content, "base64") : null };
  }

  const db = initializeStore();
  const record = db.prepare("SELECT * FROM uploads WHERE id = ?").get(id);
  return record || null;
};

export const getUploadRecordByPublicId = (publicId) => {
  if (usingJsonFallback) {
    const all = readJsonDb();
    return all.find((r) => r.publicId === publicId) || null;
  }

  const db = initializeStore();
  const record = db.prepare("SELECT * FROM uploads WHERE publicId = ?").get(publicId);
  return record || null;
};

export const deleteUploadRecord = (publicId) => {
  if (usingJsonFallback) {
    const all = readJsonDb();
    const idx = all.findIndex((r) => r.publicId === publicId);
    if (idx === -1) return 0;
    all.splice(idx, 1);
    writeJsonDb(all);
    inMemory.length = 0;
    inMemory.push(...all);
    return 1;
  }

  const db = initializeStore();
  if (!publicId) return 0;
  const result = db.prepare("DELETE FROM uploads WHERE publicId = ?").run(publicId);
  return result.changes;
};

initializeUploadStore();

export default initializeUploadStore;
