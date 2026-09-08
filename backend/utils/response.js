// utils/response.js

// =============================
// ✅ SUCCESS RESPONSE
// =============================
export const success = (res, data = null, message = "Success", meta = {}) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    ...(Object.keys(meta).length && { meta }),
  });
};

// =============================
// ❌ ERROR RESPONSE
// =============================
export const error = (res, message = "Error", code = 500, details = null) => {
  return res.status(code).json({
    success: false,
    message,
    ...(details && { details }),
  });
};

// =============================
// ⚠️ VALIDATION ERROR
// =============================
export const validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
  });
};

// =============================
// 🚫 NOT FOUND
// =============================
export const notFound = (res, message = "Resource not found") => {
  return res.status(404).json({
    success: false,
    message,
  });
};

// =============================
// 🔐 UNAUTHORIZED
// =============================
export const unauthorized = (res, message = "Unauthorized") => {
  return res.status(401).json({
    success: false,
    message,
  });
};
