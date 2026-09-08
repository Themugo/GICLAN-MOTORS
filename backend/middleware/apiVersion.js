// API Version Middleware
// Handles API version detection and routing

const apiVersionMiddleware = (req, res, next) => {
  // Extract version from URL path
  const versionMatch = req.path.match(/^\/api\/v(\d+)/);

  if (versionMatch) {
    req.apiVersion = parseInt(versionMatch[1], 10);
  } else if (req.path.startsWith('/api/')) {
    // Default to v1 if no version specified
    req.apiVersion = 1;
  }

  // Add version header to response
  if (req.apiVersion) {
    res.setHeader('X-API-Version', req.apiVersion.toString());
  }

  next();
};

export default apiVersionMiddleware;
