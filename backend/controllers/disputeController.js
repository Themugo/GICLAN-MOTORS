// Canonical dispute controller: every vehicle-purchase dispute is an escrow workflow.
import { logError, logInfo } from "../utils/logger.js";
import { getIO } from "../utils/io.js";
import { success, error, notFound } from "../utils/response.js";
import { uploadEvidenceToCloudinary } from "../middleware/evidenceUpload.js";
import {
  openDispute as openDisputeWorkflow, getEscrowDispute as getEscrowDisputeWorkflow, listDisputes as listDisputeWorkflows, disputeStats as getDisputeStatsWorkflow,
  transitionWorkflow, assignDispute as assignDisputeWorkflow, addEvidence as addDisputeEvidence, deleteEvidence as deleteDisputeEvidence, verifyEvidence as verifyDisputeEvidence,
  addNote as addDisputeNote, startMediation as startDisputeMediation, completeMediation as completeDisputeMediation, resolveDispute as resolveDisputeWorkflow,
  submitAppeal as submitDisputeAppeal, reviewAppeal as reviewDisputeAppeal,
} from "../services/dispute.service.js";

const staff = (role) => ["admin", "superadmin", "escrow_officer"].includes(role);
const emit = (dispute, event = "disputeUpdate", extra = {}) => {
  const io = getIO(); if (!io || !dispute?.escrow) return;
  const e = dispute.escrow;
  const payload = { disputeId: dispute.id || dispute._id, escrowId: e.id, status: dispute.status, ...extra };
  io.to(`user_${e.buyer}`).emit(event, payload);
  io.to(`user_${e.seller}`).emit(event, payload);
  io.to(`dispute_${e.id}`).emit(event, payload);
  if (event !== "newDispute") io.to("admins").emit(event, payload);
};

export const createDispute = async (req,res) => { try {
  const { escrowId,title,description,category,priority }=req.body;
  const d=await openDisputeWorkflow({escrowId,actorId:req.user.id,role:req.user.role,title,description,category,priority,idempotencyKey:req.idempotencyKey});
  emit(d,"disputeUpdate",{status:"open"}); emit(d,"newDispute",{title:d.title});
  success(res,d,"Dispute created successfully",{status:201});
} catch(e){logError("Create dispute failed",e);error(res,e.message||"Failed to create dispute",400)} };

export const getUserDisputes = async (req,res) => { try {
  const disputes=await listDisputeWorkflows({actorId:req.user.id,role:req.user.role,filters:req.query});
  success(res,{disputes,pagination:{page:Number(req.query.page||1),limit:Number(req.query.limit||50),total:disputes.length,pages:1}});
} catch(e){logError("Get disputes failed",e);error(res,"Failed to get disputes",500)} };

export const getAllDisputes = async (req,res) => { try { const disputes=await listDisputeWorkflows({actorId:req.user.id,role:req.user.role,filters:req.query}); success(res,{disputes,pagination:{page:Number(req.query.page||1),limit:Number(req.query.limit||50),total:disputes.length,pages:1}}); } catch(e){logError("Get all disputes failed",e);error(res,"Failed to get disputes",500)} };

export const getDispute = async (req,res) => { try { const d=await getEscrowDisputeWorkflow(req.params.id,req.user.id,req.user.role); if(!d)return notFound(res,"Dispute not found"); success(res,{dispute:d,evidence:d.evidence||[],allowedTransitions:staff(req.user.role)?[]:[]}); } catch(e){error(res,e.message||"Failed to get dispute",403)} };

export const transitionDisputeState = async (req,res) => { try { const d=await transitionWorkflow({escrowId:req.params.id,actorId:req.user.id,role:req.user.role,nextStatus:req.body.nextStatus,reason:req.body.reason}); emit(d,"disputeUpdate"); success(res,d,`Dispute moved to ${d.status}`); } catch(e){error(res,e.message||"Failed to transition dispute",400)} };

export const uploadEvidence = async (req,res) => { try {
  const {type,description,cloudUrl,cloudPublicId,cloudThumb}=req.body; let item={type:type||"document",description:description||""};
  if(req.file){const c=await uploadEvidenceToCloudinary(req.file,type||"document"); Object.assign(item,{url:c.url,publicId:c.public_id,thumbnailUrl:c.thumb,fileName:req.file.originalname,mimeType:req.file.mimetype,size:req.file.size});}
  else if(cloudUrl){Object.assign(item,{url:cloudUrl,publicId:cloudPublicId||null,thumbnailUrl:cloudThumb||null,fileName:req.body.fileName||"evidence-file",mimeType:req.body.mimeType||"application/octet-stream",size:Number(req.body.fileSize)||0});}
  else return error(res,"No file or cloud URL provided",400);
  const d=await addDisputeEvidence({escrowId:req.params.id,actorId:req.user.id,role:req.user.role,evidence:item}); emit(d.dispute,"disputeUpdate",{evidenceAdded:d.item}); emit(d.dispute,"evidenceUploaded",{evidence:d.item}); success(res,d.item,"Evidence uploaded successfully",{status:201});
} catch(e){logError("Evidence upload failed",e);error(res,e.message||"Failed to upload evidence",400)} };
export const getEvidence = async (req,res)=>{try{const d=await getEscrowDisputeWorkflow(req.params.id,req.user.id,req.user.role);if(!d)return notFound(res,"Dispute not found");success(res,{evidence:d.evidence||[]})}catch(e){error(res,e.message||"Failed to get evidence",403)}};
export const getEvidenceItem = async (req,res)=>{try{const d=await getEscrowDisputeWorkflow(req.params.id,req.user.id,req.user.role);const item=d?.evidence?.find(x=>String(x._id)===String(req.params.evidenceId));if(!item)return notFound(res,"Evidence not found");success(res,{evidence:item})}catch(e){error(res,e.message||"Failed to get evidence",403)}};
export const deleteEvidence = async (req,res)=>{try{const d=await deleteDisputeEvidence({escrowId:req.params.id,actorId:req.user.id,role:req.user.role,evidenceId:req.params.evidenceId});emit(d,"disputeUpdate");success(res,d,"Evidence deleted")}catch(e){error(res,e.message||"Failed to delete evidence",400)}};
export const verifyEvidence = async (req,res)=>{try{const d=await verifyDisputeEvidence({escrowId:req.params.id,actorId:req.user.id,evidenceId:req.params.evidenceId});emit(d,"disputeUpdate");success(res,d,"Evidence verified")}catch(e){error(res,e.message||"Failed to verify evidence",400)}};
export const addInternalNote = async (req,res)=>{try{const d=await addDisputeNote({escrowId:req.params.id,actorId:req.user.id,note:req.body.note,isPrivate:req.body.isPrivate!==false});emit(d,"disputeUpdate");success(res,{notes:d.internalNotes},"Note added")}catch(e){error(res,e.message||"Failed to add note",400)}};
export const assignDispute = async (req,res)=>{try{const d=await assignDisputeWorkflow({escrowId:req.params.id,actorId:req.user.id,assigneeId:req.body.assigneeId});emit(d,"disputeUpdate");success(res,d,"Dispute assigned")}catch(e){error(res,e.message||"Failed to assign dispute",400)}};
export const startMediation = async (req,res)=>{try{const d=await startDisputeMediation({escrowId:req.params.id,actorId:req.user.id,mediatorId:req.body.mediatorId,scheduledAt:req.body.scheduledAt});emit(d,"disputeUpdate");success(res,d,"Mediation started")}catch(e){error(res,e.message||"Failed to start mediation",400)}};
export const completeMediation = async (req,res)=>{try{const d=await completeDisputeMediation({escrowId:req.params.id,actorId:req.user.id,outcome:req.body.outcome,mediatorNotes:req.body.mediatorNotes,buyerSatisfied:req.body.buyerSatisfied,sellerSatisfied:req.body.sellerSatisfied});emit(d,"disputeUpdate");success(res,d,"Mediation completed")}catch(e){error(res,e.message||"Failed to complete mediation",400)}};
export const resolveDispute = async (req,res)=>{try{const d=await resolveDisputeWorkflow({escrowId:req.params.id,actorId:req.user.id,decision:req.body.decision,amount:req.body.amount,sellerAmount:req.body.sellerAmount,buyerAmount:req.body.buyerAmount,reason:req.body.reason,idempotencyKey:req.idempotencyKey});emit(d,"disputeUpdate",{resolution:d.resolution});success(res,d,"Dispute resolved successfully")}catch(e){logError("Resolve dispute failed",e);error(res,e.message||"Failed to resolve dispute",400)}};
export const submitAppeal = async (req,res)=>{try{const d=await submitDisputeAppeal({escrowId:req.params.id,actorId:req.user.id,role:req.user.role,reason:req.body.reason,additionalDetails:req.body.additionalDetails});emit(d,"disputeUpdate");success(res,d,"Appeal submitted")}catch(e){error(res,e.message||"Failed to submit appeal",400)}};
export const reviewAppeal = async (req,res)=>{try{const d=await reviewDisputeAppeal({escrowId:req.params.id,actorId:req.user.id,decision:req.body.decision,reviewNotes:req.body.reviewNotes});emit(d,"disputeUpdate");success(res,d,"Appeal reviewed")}catch(e){error(res,e.message||"Failed to review appeal",400)}};
export const getDisputeStats = async (req,res)=>{try{success(res,await getDisputeStatsWorkflow())}catch(e){error(res,e.message||"Failed to get dispute stats",500)}};
