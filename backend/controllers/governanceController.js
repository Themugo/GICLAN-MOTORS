import * as db from "../db/index.js";
import AuditLog from "../models/AuditLog.js";

const TABLES = {
  policies: "governance_policies", changes: "change_requests", approvals: "approval_rules",
  features: "feature_lifecycles", risks: "risk_assessments", standards: "enterprise_standards",
  countries: "country_rules", partners: "partner_requirements", releases: "releases", decisions: "decision_registers",
};
const list = (table, req, extra = {}) => db.findAll(table, { filters: req.query?.status ? { status: req.query.status, ...extra } : extra, orderBy: "createdAt", ascending: false, limit: Math.min(Number(req.query?.limit) || 100, 200) });
const created = (req, body) => ({ ...body, createdBy: req.user?.id, updatedBy: req.user?.id });
const requireFields = (body, fields) => fields.filter((f) => body?.[f] === undefined || body?.[f] === null || body?.[f] === "");

export async function getGovernanceDashboard(req,res) {
  const counts = await Promise.all(Object.entries(TABLES).map(async ([key, table]) => [key, await db.count(table, {})]));
  const [risks, changes, releases] = await Promise.all([db.findAll(TABLES.risks,{orderBy:"createdAt",ascending:false,limit:10}),db.findAll(TABLES.changes,{orderBy:"createdAt",ascending:false,limit:10}),db.findAll(TABLES.releases,{orderBy:"createdAt",ascending:false,limit:10})]);
  return res.json({success:true,data:{counts:Object.fromEntries(counts),risks,changeRequests:changes,releases}});
}
export const getPolicies = (req,res)=>list(TABLES.policies,req).then(data=>res.json({success:true,data}));
export async function getPolicy(req,res){const data=await db.findById(TABLES.policies,req.params.id); if(!data)return res.status(404).json({success:false,error:"Policy not found"}); return res.json({success:true,data});}
export async function createPolicy(req,res){const missing=requireFields(req.body,["name","description"]);if(missing.length)return res.status(400).json({success:false,error:`Missing fields: ${missing.join(", ")}`});const data=await db.create(TABLES.policies,created(req,req.body));return res.status(201).json({success:true,data});}
export async function updatePolicy(req,res){const data=await db.update(TABLES.policies,req.params.id,{...req.body,updatedBy:req.user?.id});return res.json({success:true,data});}
export const getChangeRequests=(req,res)=>list(TABLES.changes,req).then(data=>res.json({success:true,data}));
export async function getChangeRequest(req,res){const data=await db.findById(TABLES.changes,req.params.id);if(!data)return res.status(404).json({success:false,error:"Change request not found"});return res.json({success:true,data});}
export async function createChangeRequest(req,res){const missing=requireFields(req.body,["title","description"]);if(missing.length)return res.status(400).json({success:false,error:`Missing fields: ${missing.join(", ")}`});const data=await db.create(TABLES.changes,{...created(req,req.body),status:"draft"});return res.status(201).json({success:true,data});}
export async function submitForApproval(req,res){const current=await db.findById(TABLES.changes,req.params.id);if(!current)return res.status(404).json({success:false,error:"Change request not found"});if(!["draft","rejected"].includes(current.status))return res.status(409).json({success:false,error:"Change request cannot be submitted from its current state"});return res.json({success:true,data:await db.update(TABLES.changes,req.params.id,{status:"pending_approval",submittedBy:req.user?.id,submittedAt:new Date().toISOString()})});}
async function reviewChange(req,res,status){const current=await db.findById(TABLES.changes,req.params.id);if(!current)return res.status(404).json({success:false,error:"Change request not found"});if(current.status!=="pending_approval")return res.status(409).json({success:false,error:"Change request is not awaiting approval"});return res.json({success:true,data:await db.update(TABLES.changes,req.params.id,{status,reviewedBy:req.user?.id,reviewedAt:new Date().toISOString(),reviewComments:req.body?.comments||null,rejectionReason:req.body?.reason||null})});}
export const approveChangeRequest=(req,res)=>reviewChange(req,res,"approved");
export const rejectChangeRequest=(req,res)=>reviewChange(req,res,"rejected");
export const getApprovalRules=(req,res)=>list(TABLES.approvals,req).then(data=>res.json({success:true,data}));
export async function createApprovalRule(req,res){const data=await db.create(TABLES.approvals,created(req,req.body));return res.status(201).json({success:true,data});}
export async function updateApprovalRule(req,res){return res.json({success:true,data:await db.update(TABLES.approvals,req.params.id,{...req.body,updatedBy:req.user?.id})});}
export const getFeatureLifecycles=(req,res)=>list(TABLES.features,req).then(data=>res.json({success:true,data}));
export async function createFeatureLifecycle(req,res){return res.status(201).json({success:true,data:await db.create(TABLES.features,created(req,req.body))});}
export async function updateFeatureStage(req,res){const stage=req.body?.stage;if(!stage)return res.status(400).json({success:false,error:"stage is required"});return res.json({success:true,data:await db.update(TABLES.features,req.params.id,{stage,stageComments:req.body?.comments||null,updatedBy:req.user?.id})});}
export const getRisks=(req,res)=>list(TABLES.risks,req).then(data=>res.json({success:true,data}));
export async function createRisk(req,res){const missing=requireFields(req.body,["title","severity"]);if(missing.length)return res.status(400).json({success:false,error:`Missing fields: ${missing.join(", ")}`});return res.status(201).json({success:true,data:await db.create(TABLES.risks,{...created(req,req.body),status:req.body.status||"open"})});}
export async function updateRiskStatus(req,res){return res.json({success:true,data:await db.update(TABLES.risks,req.params.id,{...req.body,updatedBy:req.user?.id})});}
export const getStandards=(req,res)=>list(TABLES.standards,req).then(data=>res.json({success:true,data}));
export async function createStandard(req,res){return res.status(201).json({success:true,data:await db.create(TABLES.standards,created(req,req.body))});}
export const getCountryRules=(req,res)=>list(TABLES.countries,req).then(data=>res.json({success:true,data}));
export async function createCountryRule(req,res){return res.status(201).json({success:true,data:await db.create(TABLES.countries,created(req,req.body))});}
export const getPartnerRequirements=(req,res)=>list(TABLES.partners,req).then(data=>res.json({success:true,data}));
export async function createPartnerRequirement(req,res){return res.status(201).json({success:true,data:await db.create(TABLES.partners,created(req,req.body))});}
export const getReleases=(req,res)=>list(TABLES.releases,req).then(data=>res.json({success:true,data}));
export async function createRelease(req,res){return res.status(201).json({success:true,data:await db.create(TABLES.releases,{...created(req,req.body),status:req.body.status||"planned"})});}
export async function updateReleaseStatus(req,res){return res.json({success:true,data:await db.update(TABLES.releases,req.params.id,{...req.body,updatedBy:req.user?.id})});}
export const getDecisions=(req,res)=>list(TABLES.decisions,req).then(data=>res.json({success:true,data}));
export async function createDecision(req,res){return res.status(201).json({success:true,data:await db.create(TABLES.decisions,created(req,req.body))});}
export async function getAuditLogs(req,res){const limit=Math.min(Math.max(Number.parseInt(req.query.limit,10)||100,1),200);return res.json({success:true,data:await AuditLog.findAll({limit}),source:"audit_logs"});}
export async function getComplianceDashboard(req,res){const [risks,policies,standards]=await Promise.all([db.count(TABLES.risks,{status:"open"}),db.count(TABLES.policies,{status:"active"}),db.count(TABLES.standards,{status:"active"})]);return res.json({success:true,data:{openRisks:risks,activePolicies:policies,activeStandards:standards}});}
export async function getGovernanceHelp(req,res){const q=String(req.body?.question||"").trim();if(!q)return res.status(400).json({success:false,error:"question is required"});return res.json({success:true,data:{question:q,answer:"Governance assistance is advisory only. Use the policy, risk, change and audit records as the authoritative source."}});}
export async function getGovernanceReport(req,res){const [policies,risks,changes,releases,decisions]=await Promise.all([db.findAll(TABLES.policies,{limit:200}),db.findAll(TABLES.risks,{limit:200}),db.findAll(TABLES.changes,{limit:200}),db.findAll(TABLES.releases,{limit:200}),db.findAll(TABLES.decisions,{limit:200})]);return res.json({success:true,data:{policies,risks,changes,releases,decisions}});}
