import fs from "node:fs";

const checks = [
  {
    name: "edit snapshots old listing before mutation",
    file: "backend/controllers/carController.js",
    required: [
      "const oldData = car.toObject();",
      "await logVehicleEdited(car, oldData, req.user, req);",
    ],
  },
  {
    name: "edit uses city/location_city contract",
    file: "backend/controllers/carController.js",
    required: [
      "req.body.city = [cityPart, addressPart].filter(Boolean).join(\", \");",
      '"city",',
    ],
    forbidden: ["req.body.location =", "car.location ||"],
  },
  {
    name: "audit compares real listing field names",
    file: "backend/services/auditService.js",
    required: ['"brand",', '"city",'],
    forbidden: ['"make",', '"location",'],
  },
  {
    name: "seller deletion does not refund trial usage",
    file: "backend/controllers/carController.js",
    required: ["select(\"listingCount\")", "listingCount - 1"],
    forbidden: ["trialListingsUsed - 1"],
  },
  {
    name: "admin deletion does not refund trial usage",
    file: "backend/routes/adminRoutes.js",
    required: ["$inc: { listingCount: -1 }"],
    forbidden: ["trialListingsUsed: -1"],
  },
];

let failures = 0;
for (const check of checks) {
  const text = fs.readFileSync(check.file, "utf8");
  const missing = (check.required || []).filter((needle) => !text.includes(needle));
  const forbidden = (check.forbidden || []).filter((needle) => text.includes(needle));
  if (missing.length || forbidden.length) {
    failures += 1;
    console.error(`FAIL ${check.name}`);
    if (missing.length) console.error(`  missing: ${missing.join(" | ")}`);
    if (forbidden.length) console.error(`  forbidden: ${forbidden.join(" | ")}`);
  } else {
    console.log(`PASS ${check.name}`);
  }
}

console.log(`\n${checks.length - failures}/${checks.length} checks passed`);
process.exitCode = failures ? 1 : 0;
