import { findAll, count } from "../db/index.js";

const since = (days=1) => new Date(Date.now()-days*86400000).toISOString();
const c = (table, filters={}) => count(table, filters).catch(()=>0);

export const getSystemHealth = async (req,res) => {
  const services = [];
  const checks = [['database','users'],['marketplace','cars'],['payments','payments'],['inspections','vehicle_inspections'],['search','search_analytics'],['notifications','notifications']];
  for (const [name,table] of checks) { const started=Date.now(); let status='healthy'; let error=null; try { await c(table); } catch(e){ status='degraded'; error=e.message; } services.push({name,status,latency:Date.now()-started,error}); }
  res.json({success:true,data:{services,summary:{healthy:services.filter(x=>x.status==='healthy').length,degraded:services.filter(x=>x.status==='degraded').length,down:0},checkedAt:new Date().toISOString()}});
};

export const getPaymentFailures = async (req,res) => {
  const [pending,failed24h,success24h,processing] = await Promise.all([c('payments',{status:'pending'}),c('payments',{status:'failed',createdAt:{$gte:since()}}),c('payments',{status:'success',createdAt:{$gte:since()}}),c('payments',{status:'processing'})]);
  res.json({success:true,data:{pendingPayments:pending,failedPayments24h:failed24h,successfulPayments24h:success24h,processingPayments:processing}});
};

export const getEscrowDisputes = async (req,res) => {
  const [active,refunded,released,disputed] = await Promise.all([c('escrows',{status:{$in:['pending','funded','vehicle_confirmed','delivered']}}),c('escrows',{status:'refunded'}),c('escrows',{status:'released'}),c('escrows',{status:'disputed'})]);
  res.json({success:true,data:{activeEscrows:active,refundedEscrows:refunded,releasedEscrows:released,activeDisputes:disputed}});
};

export const getDealerOnboarding = async (req,res) => {
  const [total,pending,approved,suspended] = await Promise.all([c('dealers',{}),c('dealer_verifications',{verificationStatus:{$in:['pending','under_review']}}),c('dealers',{approved:true}),c('dealers',{isSuspended:true})]);
  res.json({success:true,data:{totalDealers:total,pendingApplications:pending,approvedDealers:approved,suspendedDealers:suspended}});
};

export const getListingModeration = async (req,res) => {
  const [pending,rejected,available,sold] = await Promise.all([c('cars',{status:'pending'}),c('cars',{status:'rejected'}),c('cars',{status:'available'}),c('cars',{status:'sold'})]);
  res.json({success:true,data:{pending, rejected, available, sold}});
};

export const getQueueHealth = async (req,res) => {
  const [payments,inspections,support,dealers] = await Promise.all([c('payments',{status:'pending'}),c('vehicle_inspections',{status:{$in:['requested','assigned']}}),c('support_tickets',{status:{$in:['open','pending','in_progress','escalated']}}),c('dealer_verifications',{verificationStatus:{$in:['pending','under_review']}})]);
  res.json({success:true,data:{queues:{payments,inspections,support,dealers},generatedAt:new Date().toISOString()}});
};

export const getNotifications = async (req,res) => {
  const rows=await findAll('notifications',{filters:{user:req.user.id},orderBy:'createdAt',ascending:false,limit:50});
  res.json({success:true,data:rows});
};

export const getFraudAlerts = async (req,res) => {
  const rows=await findAll('fraud_detections',{filters:{status:{$nin:['dismissed','action_taken']}},orderBy:'createdAt',ascending:false,limit:100}).catch(()=>[]);
  res.json({success:true,data:{alerts:rows,count:rows.length}});
};

export const getDashboardOverview = async (req,res) => {
  const [users,cars,dealers,payments,escrows,inspections,disputes] = await Promise.all([c('users',{}),c('cars',{deletedAt:null}),c('dealers',{}),c('payments',{status:'pending'}),c('escrows',{}),c('vehicle_inspections',{}),c('escrows',{status:'disputed'})]);
  res.json({success:true,data:{counts:{users,cars,dealers,pendingPayments:payments,escrows,inspections,disputes},generatedAt:new Date().toISOString()}});
};
