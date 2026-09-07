// Canonical dispute controller: vehicle-purchase disputes are escrow-backed.
import { isValidId } from "../utils/validateId.js";
import { success, error, notFound } from "../utils/response.js";
import { uploadEvidenceToCloudinary } from "../middleware/evidenceUpload.js";
import * as dispute from "../services/dispute.service.js";
import { getAllowedTransitions } from "../services/disputeStateMachine.js";

const role = (req) => req.user?.role || "";
const staff = (req) => ["admin", "superadmin", "escrow_officer"].includes(role(req));
const requireId = (req, res) => isValidId(req.params.id) || (error(res, "Invalid dispute ID", 400), false);

export const createDispute = async (req, res) => {
  try {
    const { escrowId, title, description, category, priority } = req.body;
    const data = await dispute.openDispute({ escrowId, actorId: req.user.id, role: role(req), title, description, category, priority, reason: description, idempotencyKey: req.idempotencyKey });
    success(res, data, "Dispute created successfully", { status: 201 });
  } catch (e) { error(res, e.message || "Failed to create dispute", 400); }
};

export const getUserDisputes = async (req, res) => {
  try { success(res, { disputes: await dispute.listDisputes({ actorId: req.user.id, role: role(req), filters: req.query }) }); }
  catch (e) { error(res, "Failed to get disputes", 500); }
};
export const getAllDisputes = async (req, res) => {
  try { success(res, { disputes: await dispute.listDisputes({ actorId: req.user.id, role: role(req), filters: req.query }) }); }
  catch (e) { error(res, "Failed to get disputes", 500); }
};
export const getDispute = async (req, res) => {
  try { if (!requireId(req,res)) return; const data = await dispute.getEscrowDispute(req.params.id, req.user.id, role(req)); if (!data) return notFound(res,"Dispute not found"); success(res,{ dispute:data, evidence:data.evidence||[], allowedTransitions: staff(req) ? getAllowedTransitions(data.status) : [] }); }
  catch (e) { error(res, e.message || "Failed to get dispute", e.message === "Access denied" ? 403 : 500); }
};
export const transitionDisputeState = async (req,res) => { try { if(!requireId(req,res)) return; success(res, await dispute.transitionWorkflow({escrowId:req.params.id,actorId:req.user.id,role:role(req),nextStatus:req.body.nextStatus,reason:req.body.reason}), "Dispute state updated"); } catch(e){ error(res,e.message||"Failed to transition dispute",400); } };
export const uploadEvidence = async (req,res) => {
  try {
    if(!requireId(req,res)) return;
    let payload={};
    const { type, description }=req.body;
    if(req.file){ const c=await uploadEvidenceToCloudinary(req.file,type||"document"); payload={type:type||"document",description:description||"",fileName:req.file.originalname,mimeType:req.file.mimetype,size:req.file.size,url:c.url,publicId:c.public_id,thumbnailUrl:c.thumb}; }
    else if(req.body.cloudUrl){ payload={type:type||"document",description:description||"",fileName:req.body.fileName||"evidence-file",mimeType:req.body.mimeType||"application/octet-stream",size:Number(req.body.fileSize)||0,url:req.body.cloudUrl,publicId:req.body.cloudPublicId||null,thumbnailUrl:req.body.cloudThumb||null}; }
    else return error(res,"No file or cloud URL provided",400);
    const result=await dispute.addEvidence({escrowId:req.params.id,actorId:req.user.id,role:role(req),evidence:payload}); success(res,result.item,"Evidence uploaded successfully",{status:201});
  } catch(e){ error(res,e.message||"Failed to upload evidence",400); }
};
export const getEvidence = async(req,res)=>{ try{if(!requireId(req,res))return; const d=await dispute.getEscrowDispute(req.params.id,req.user.id,role(req)); if(!d)return notFound(res,"Dispute not found"); success(res,{evidence:d.evidence||[]});}catch(e){error(res,e.message||"Failed to get evidence",403);} };
export const getEvidenceItem = async(req,res)=>{ try{if(!requireId(req,res))return; const d=await dispute.getEscrowDispute(req.params.id,req.user.id,role(req)); const item=d?.evidence?.find(x=>String(x._id)===String(req.params.evidenceId)); if(!item)return notFound(res,"Evidence not found"); success(res,{evidence:item});}catch(e){error(res,e.message||"Failed to get evidence",403);} };
export const deleteEvidence = async(req,res)=>{try{if(!requireId(req,res))return; success(res,await dispute.deleteEvidence({escrowId:req.params.id,actorId:req.user.id,role:role(req),evidenceId:req.params.evidenceId}),"Evidence deleted");}catch(e){error(res,e.message||"Failed to delete evidence",400);}};
export const verifyEvidence = async(req,res)=>{try{if(!requireId(req,res))return; success(res,await dispute.verifyEvidence({escrowId:req.params.id,actorId:req.user.id,evidenceId:req.params.evidenceId}),"Evidence verified");}catch(e){error(res,e.message||"Failed to verify evidence",400);}};
export const addInternalNote = async(req,res)=>{try{if(!requireId(req,res))return; success(res,await dispute.addNote({escrowId:req.params.id,actorId:req.user.id,note:req.body.note,isPrivate:req.body.isPrivate!==false}),"Note added");}catch(e){error(res,e.message||"Failed to add note",400);}};
export const assignDispute = async(req,res)=>{try{if(!requireId(req,res))return; const d=await dispute.getEscrowDispute(req.params.id,req.user.id,role(req)); if(!d)return notFound(res,"Dispute not found"); const Escrow=(await import("../models/Escrow.js")).default; const e=await Escrow.findById(req.params.id); e.disputeAssignedTo=req.body.assigneeId; e.disputeTimeline=[...(e.disputeTimeline||[]),{action:`Assigned to admin ${req.body.assigneeId}`,actor:req.user.id,at:new Date().toISOString()}]; await e.save(); success(res,e,"Dispute assigned");}catch(e){error(res,e.message||"Failed to assign dispute",400);}};
export const startMediation = async(req,res)=>{try{if(!requireId(req,res))return; success(res,await dispute.startMediation({escrowId:req.params.id,actorId:req.user.id,mediatorId:req.body.mediatorId,scheduledAt:req.body.scheduledAt}),"Mediation started");}catch(e){error(res,e.message||"Failed to start mediation",400);}};
export const completeMediation = async(req,res)=>{try{if(!requireId(req,res))return; success(res,await dispute.completeMediation({escrowId:req.params.id,actorId:req.user.id,...req.body}),"Mediation completed");}catch(e){error(res,e.message||"Failed to complete mediation",400);}};
export const resolveDispute = async(req,res)=>{try{if(!requireId(req,res))return; success(res,await dispute.resolveDispute({escrowId:req.params.id,actorId:req.user.id,...req.body,idempotencyKey:req.idempotencyKey}),"Dispute resolved successfully");}catch(e){error(res,e.message||"Failed to resolve dispute",400);}};
export const submitAppeal = async(req,res)=>{try{if(!requireId(req,res))return; success(res,await dispute.submitAppeal({escrowId:req.params.id,actorId:req.user.id,role:role(req),...req.body}),"Appeal submitted");}catch(e){error(res,e.message||"Failed to submit appeal",400);}};
export const reviewAppeal = async(req,res)=>{try{if(!requireId(req,res))return; success(res,await dispute.reviewAppeal({escrowId:req.params.id,actorId:req.user.id,...req.body}),"Appeal reviewed");}catch(e){error(res,e.message||"Failed to review appeal",400);}};
export const getDisputeStats = async(req,res)=>{try{success(res,{stats:await dispute.disputeStats()});}catch(e){error(res,"Failed to get dispute statistics",500);}};
