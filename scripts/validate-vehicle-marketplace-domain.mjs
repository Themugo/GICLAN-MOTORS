import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (name, condition, detail) => checks.push({ name, ok: Boolean(condition), detail });

assert("canonical vehicle read service exists", exists("src/services/vehicleApi.ts"));
assert("public browse uses canonical vehicle service", !read("src/pages/BrowsePage.jsx").includes("carsAPI."));
assert("public showroom uses canonical vehicle service", !read("src/pages/Showroom.jsx").includes("carsAPI."));
assert("vehicle detail uses canonical vehicle service", !read("src/pages/CarDetailPage.jsx").includes("carsAPI."));
assert("compare uses canonical vehicle service", !read("src/pages/Compare.tsx").includes("carsAPI."));
assert("home uses canonical vehicle service", !read("src/pages/HomePage.jsx").includes("carsAPI."));
assert("seller analytics uses own-listings boundary", read("src/pages/seller/SellerAnalytics.jsx").includes("getMyListings"));
assert("private seller dashboard uses own-listings boundary", read("src/pages/PrivateSellerDashboard.jsx").includes("getMyListings"));
assert("dealer profile supports real dealer filter", read("backend/validation/query.schema.js").includes("dealer: z.string().optional()"));
assert("seller/dealer filter reaches controller", /else if \(dealer\)[\s\S]*query\.dealer = dealer/.test(read("backend/controllers/carController.js")));
assert("city filter uses canonical city field", !read("backend/controllers/carController.js").includes('query["location.city"]'));
assert("obsolete unauthenticated favorite route removed", !read("backend/routes/carRoutes.js").includes("/:id/favorite"));
assert("favorite counter cannot decrement below zero", read("backend/controllers/favoriteController.js").includes('favoritesCount: { $gt: 0 }'));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
if (failed.length) process.exit(1);
console.log(`\n${checks.length}/${checks.length} PASS`);
