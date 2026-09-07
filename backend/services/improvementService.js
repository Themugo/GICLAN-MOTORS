import { getSupabase } from "../utils/supabase.js";
import { create, findAll, findById, update, count } from "../db/index.js";

const CATEGORIES = ["product","marketplace","customer_experience","ux","performance","revenue","technical_debt","security","operations","other"];
const STATUSES = ["submitted","triaged","approved","in_progress","blocked","completed","rejected"];
const PRIORITIES = ["low","medium","high","critical"];
const EXPERIMENT_STATUSES = ["draft","planned","running","paused","completed","cancelled"];

const cleanText = (value, max) => String(value ?? "").trim().slice(0, max);
export const validateImprovementInput = (body = {}) => {
  const title = cleanText(body.title, 180);
  const description = cleanText(body.description, 5000);
  if (title.length < 3 || description.length < 10) throw Object.assign(new Error("Title and description are required"), { status: 400 });
  if (!CATEGORIES.includes(body.category || "other")) throw Object.assign(new Error("Invalid improvement category"), { status: 400 });
  const impact = Number(body.impactScore ?? 3); const effort = Number(body.effortScore ?? 3);
  if (!Number.isInteger(impact) || impact < 1 || impact > 5 || !Number.isInteger(effort) || effort < 1 || effort > 5) throw Object.assign(new Error("Impact and effort must be integers from 1 to 5"), { status: 400 });
  return { title, description, category: body.category || "other", priority: PRIORITIES.includes(body.priority) ? body.priority : "medium", impactScore: impact, effortScore: effort, ownerId: body.ownerId || null, dueAt: body.dueAt || null, metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {} };
};

export async function listImprovements(filters = {}) {
  const rows = await findAll("improvements", { filters, orderBy: "createdAt", ascending: false, limit: 200 });
  return rows;
}
export async function getImprovement(id) { return findById("improvements", id); }
export async function createImprovementRecord(input, actorId) {
  const data = validateImprovementInput(input);
  const duplicate = await findAll("improvements", { filters: { status: { $nin: ["completed","rejected"] }, category: data.category, title: { $ilike: data.title } }, limit: 5 });
  if (duplicate.length) throw Object.assign(new Error("A similar active improvement already exists"), { status: 409, code: "IMPROVEMENT_DUPLICATE" });
  return create("improvements", { ...data, createdBy: actorId, ownerId: data.ownerId, status: "submitted" });
}
export async function updateImprovementRecord(id, body, actorId) {
  const current = await getImprovement(id); if (!current) throw Object.assign(new Error("Improvement not found"), { status: 404 });
  if (current.status === "completed") throw Object.assign(new Error("Completed improvements are immutable"), { status: 409 });
  const patch = {};
  if (body.title !== undefined) patch.title = cleanText(body.title, 180);
  if (body.description !== undefined) patch.description = cleanText(body.description, 5000);
  if (body.priority !== undefined && PRIORITIES.includes(body.priority)) patch.priority = body.priority;
  if (body.category !== undefined && CATEGORIES.includes(body.category)) patch.category = body.category;
  if (body.ownerId !== undefined) patch.ownerId = body.ownerId || null;
  if (body.dueAt !== undefined) patch.dueAt = body.dueAt || null;
  if (body.impactScore !== undefined) patch.impactScore = Math.max(1, Math.min(5, Number(body.impactScore)));
  if (body.effortScore !== undefined) patch.effortScore = Math.max(1, Math.min(5, Number(body.effortScore)));
  if (body.metadata !== undefined && body.metadata && typeof body.metadata === "object") patch.metadata = body.metadata;
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw Object.assign(new Error("Invalid improvement status"), { status: 400 });
    const { data, error } = await getSupabase().rpc("kayad_change_improvement_status_atomic", { p_id: id, p_actor: actorId, p_to_status: body.status, p_owner: patch.ownerId ?? null, p_due_at: patch.dueAt ?? null });
    if (error) throw error;
    delete patch.status; if (Object.keys(patch).length) await update("improvements", id, patch);
    return data;
  }
  return update("improvements", id, patch);
}

export async function createExperimentRecord(body, actorId) {
  const name=cleanText(body.name,180), hypothesis=cleanText(body.hypothesis,5000), metric=cleanText(body.metric,180);
  if(name.length<3||hypothesis.length<10||metric.length<2) throw Object.assign(new Error("Name, hypothesis and metric are required"),{status:400});
  return create("experiments", { name,hypothesis,metric,status:"draft",ownerId:body.ownerId||null,createdBy:actorId,metadata:body.metadata&&typeof body.metadata==="object"?body.metadata:{} });
}
export async function updateExperimentRecord(id, body) { const current=await findById("experiments",id); if(!current) throw Object.assign(new Error("Experiment not found"),{status:404}); if(current.status==='completed'||current.status==='cancelled') throw Object.assign(new Error("Finished experiments are immutable"),{status:409}); const patch={}; for(const k of ['name','hypothesis','metric','ownerId','resultSummary']) if(body[k]!==undefined) patch[k]=cleanText(body[k],5000); if(body.status!==undefined){if(!EXPERIMENT_STATUSES.includes(body.status)) throw Object.assign(new Error('Invalid experiment status'),{status:400}); patch.status=body.status;} return update('experiments',id,patch); }
export async function transitionExperiment(id,status){if(!EXPERIMENT_STATUSES.includes(status)) throw Object.assign(new Error('Invalid experiment status'),{status:400}); const current=await findById('experiments',id); if(!current) throw Object.assign(new Error('Experiment not found'),{status:404}); const allowed={draft:['planned','cancelled'],planned:['running','cancelled'],running:['paused','completed','cancelled'],paused:['running','cancelled'],completed:[],cancelled:[]}; if(!allowed[current.status].includes(status)) throw Object.assign(new Error(`Cannot move experiment from ${current.status} to ${status}`),{status:409}); return update('experiments',id,{status,startedAt:status==='running'?new Date().toISOString():current.startedAt,stoppedAt:['completed','cancelled'].includes(status)?new Date().toISOString():current.stoppedAt}); }
export async function voteIdea(ideaId,userId){const {data,error}=await getSupabase().rpc('kayad_vote_innovation_idea_atomic',{p_idea:ideaId,p_user:userId}); if(error) throw error; return data;}
export async function dashboard(){const [improvements,experiments,ideas]=await Promise.all([listImprovements(),findAll('experiments',{orderBy:'createdAt',ascending:false,limit:100}),findAll('innovation_ideas',{orderBy:'voteCount',ascending:false,limit:100})]); const byStatus=Object.fromEntries(STATUSES.map(s=>[s,improvements.filter(x=>x.status===s).length])); const byCategory=Object.fromEntries(CATEGORIES.map(c=>[c,improvements.filter(x=>x.category===c).length])); return {success:true,data:{summary:{improvements:improvements.length,experiments:experiments.length,ideas:ideas.length,activeImprovements:improvements.filter(x=>['submitted','triaged','approved','in_progress','blocked'].includes(x.status)).length},improvementsByStatus:byStatus,improvementsByCategory:byCategory,experimentsByStatus:Object.fromEntries(EXPERIMENT_STATUSES.map(s=>[s,experiments.filter(x=>x.status===s).length])),topIdeas:ideas.slice(0,10)},source:'continuous_improvement'};}
export async function categoryAnalytics(category){const rows=await listImprovements({category}); return {category,count:rows.length,open:rows.filter(r=>!['completed','rejected'].includes(r.status)).length,completed:rows.filter(r=>r.status==='completed').length,critical:rows.filter(r=>r.priority==='critical').length};}
export async function report(){const d=await dashboard(); return {success:true,data:d.data,generatedAt:new Date().toISOString(),source:'operational_improvement_records'};}
