import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { optimizeImage } from "./imageProcessingService.js";

// =============================
// 📦 UPLOAD IMAGE (OPTIMIZED)
// =============================
export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const { compress = true, convertToWebP = true } = options;

    // Read file
    const fileBuffer = fs.readFileSync(filePath);

    // Optimize image
    const optimized = await optimizeImage(fileBuffer, {
      compress,
      convertToWebP,
      generateVariants: false,
    });

    // Upload optimized version
    const res = await cloudinary.uploader.upload(convertToWebP ? optimized.webp : optimized.compressed || fileBuffer, {
      folder: "kayad/cars",
      resource_type: "image",
      transformation: [
        { width: 1200, height: 800, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
        { progressive: "auto" },
      ],
    });

    // 🧹 cleanup local file
    fs.unlinkSync(filePath);

    return {
      url: res.secure_url,
      public_id: res.public_id,
      width: res.width,
      height: res.height,
      format: res.format,
      bytes: res.bytes,
      // Include metadata
      metadata: optimized.metadata,
    };
  } catch (err) {
    console.error("❌ CLOUDINARY ERROR:", err.message);
    throw err;
  }
};
