import { getSupabase } from "../utils/supabase.js";
import { findAll, create, update } from "../db/index.js";
import { logAuditEvent } from "../services/auditService.js";
import * as service from "../services/improvementService.js";

const send = (res, data) => res.json({ success: true, data });
const actor = (req) => ({ id: req.user.id, role: req.user.effectiveRole || req.user.role, name: req.user.name, email: req.user.email });
const audit = (req, action, target, details={}) => logAuditEvent({ action, actor:req.user.id, actorRole:req.user.effectiveRole||req.user.role, actorName:req.user.name, actorEmail:req.user.email, target, targetModel:'ContinuousImprovement', details, ipAddress:req.ip, userAgent:req.get('user-agent'), requestId:req.id });

export async function getInnovationDashboard(req,res){send(res,(await service.dashboard()).data);}
export async function getImprovementOpportunities(req,res){send(res,await service.listImprovements(req.query.category?{category:req.query.category}:{}));}
export async function createImprovement(req,res){const row=await service.createImprovementRecord(req.body,req.user.id); await audit(req,'improvement_created',row.id,{title:row.title}); res.status(201).json({success:true,data:row});}
export async function updateImprovement(req,res){const row=await service.updateImprovementRecord(req.params.improvementId,req.body,req.user.id); await audit(req,'improvement_updated',req.params.improvementId,{status:req.body.status}); send(res,row);}
export async function getAIRecommendations(req,res){const rows=await service.listImprovements({status:{$in:['submitted','triaged','approved','blocked']}}); const rec=rows.slice(0,10).map(r=>({improvementId:r.id,reason:r.priority==='critical'?'Critical priority requires attention':r.effortScore<=2&&r.impactScore>=4?'High impact / low effort candidate':r.status==='blocked'?'Blocked item requires resolution':'Review and triage',priority:r.priority})); send(res,rec);}
export async function getCustomerExperience(req,res){send(res,await service.categoryAnalytics('customer_experience'));}
export async function getUXAnalytics(req,res){send(res,await service.categoryAnalytics('ux'));}
export async function getPerformanceMetrics(req,res){send(res,await service.categoryAnalytics('performance'));}
export async function getExperiments(req,res){send(res,await findAll('experiments',{orderBy:'createdAt',ascending:false,limit:200}));}
export async function createExperiment(req,res){const row=await service.createExperimentRecord(req.body,req.user.id); await audit(req,'experiment_created',row.id,{name:row.name}); res.status(201).json({success:true,data:row});}
export async function updateExperiment(req,res){const row=await service.updateExperimentRecord(req.params.experimentId,req.body); await audit(req,'experiment_updated',row.id,{status:row.status}); send(res,row);}
export async function startExperiment(req,res){const row=await service.transitionExperiment(req.params.experimentId,'running'); await audit(req,'experiment_started',row.id); send(res,row);}
export async function stopExperiment(req,res){const row=await service.transitionExperiment(req.params.experimentId,'completed'); await audit(req,'experiment_completed',row.id); send(res,row);}
export async function getProductHealthScores(req,res){const d=(await service.dashboard()).data; send(res,{activeImprovements:d.summary.activeImprovements,critical:d.improvementsByStatus.submitted+d.improvementsByStatus.blocked,source:'operational_records'});}
export async function getInnovationIdeas(req,res){send(res,await findAll('innovation_ideas',{orderBy:'voteCount',ascending:false,limit:200}));}
export async function createInnovationIdea(req,res){const title=String(req.body.title||'').trim(),description=String(req.body.description||'').trim(); if(title.length<3||description.length<10) return res.status(400).json({success:false,message:'Title and description are required'}); const row=await create('innovation_ideas',{title,description,category:String(req.body.category||'product').slice(0,60),createdBy:req.user.id}); await audit(req,'innovation_idea_created',row.id,{title}); res.status(201).json({success:true,data:row});}
export async function voteIdea(req,res){const result=await service.voteIdea(req.params.ideaId,req.user.id); await audit(req,'innovation_idea_voted',req.params.ideaId,{added:result.voted}); send(res,result);}
export async function updateIdeaStatus(req,res){const allowed=['submitted','under_review','accepted','planned','implemented','rejected']; if(!allowed.includes(req.body.status)) return res.status(400).json({success:false,message:'Invalid idea status'}); const row=await update('innovation_ideas',req.params.ideaId,{status:req.body.status}); await audit(req,'innovation_idea_status_changed',row.id,{status:row.status}); send(res,row);}
export async function getRoadmap(req,res){const rows=await service.listImprovements({status:{$in:['approved','in_progress','blocked']}}); send(res,rows.sort((a,b)=>({critical:0,high:1,medium:2,low:3}[a.priority]??4)-({critical:0,high:1,medium:2,low:3}[b.priority]??4)))}
export async function getMarketplaceOptimization(req,res){send(res,await service.categoryAnalytics('marketplace'));}
export async function getSearchOptimization(req,res){send(res,await service.categoryAnalytics('ux'));}
export async function getRevenueOptimization(req,res){send(res,await service.categoryAnalytics('revenue'));}
export async function getImprovementReport(req,res){send(res,(await service.report()).data);}
export async function getTechnicalDebt(req,res){send(res,await service.categoryAnalytics('technical_debt'));}
export async function askAssistant(req,res){const q=String(req.body.question||'').trim(); if(!q) return res.status(400).json({success:false,message:'Question is required'}); const d=(await service.dashboard()).data; send(res,{answer:'Improvement Assistant uses current operational improvement records. Review the dashboard, triage high-impact items, and use experiments to validate measurable changes.',context:{openItems:d.summary.activeImprovements,experiments:d.summary.experiments,ideas:d.summary.ideas}});}
