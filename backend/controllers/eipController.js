import crypto from 'crypto';
import db from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { partnerPlatformService as service } from '../partnerPlatform/services/partnerPlatformService.js';

const adminOnly = (req) => ['admin', 'superadmin'].includes(req.user?.role);
const ensureAdmin = (req) => { if (!adminOnly(req)) throw new AppError('Administrator access required', 403); };
const id = (req, key='id') => req.params[key];
const clean = (value, fallback) => value === undefined ? fallback : value;

export async function getIntegrationDashboard(req,res){
  if (adminOnly(req)) {
    const [partners, applications, credentials, webhooks, deliveries, logs] = await Promise.all([
      db.find('partner_organizations', { status:'active' }), db.find('partner_applications', {}),
      db.find('api_credentials', { status:'active' }), db.find('webhook_configs', { status:'active' }),
      db.find('webhook_deliveries', {}), db.find('api_usage_logs', { created_at: { $gte: new Date(Date.now()-86400000) } }),
    ]);
    return res.json({ success:true, data:{ partners:partners.length, applications:applications.length, activeCredentials:credentials.length, activeWebhooks:webhooks.length, webhookDeliveries:deliveries.length, apiRequests24h:logs.length, failedWebhookDeliveries:deliveries.filter(x=>x.status==='failed').length } });
  }
  const partnerId = req.user?.partnerId || req.user?.partner_id;
  if (!partnerId) return res.json({ success:true, data:{ partner:null, applications:[], message:'No partner organization is linked to this account.' } });
  return res.json({ success:true, data: await service.getPartnerDashboard(partnerId) });
}

export async function getAPIs(req,res){
  await service.initializeDefaultEndpoints();
  return res.json({success:true,data:await service.getAvailableEndpoints()});
}
export async function getAPIDetails(req,res){
  const item=await db.findOne('api_endpoints',{endpoint_code:id(req,'apiId')}); if(!item) throw new AppError('API endpoint not found',404);
  return res.json({success:true,data:item});
}

export async function getPartners(req,res){ ensureAdmin(req); return res.json({success:true,data:await service.searchPartners(req.query)}); }
export async function getPartner(req,res){ ensureAdmin(req); const item=await service.getPartner(id(req)); return res.json({success:true,data:item}); }
export async function createPartner(req,res){ ensureAdmin(req); const item=await service.registerPartner(req.body); return res.status(201).json({success:true,data:item}); }
export async function updatePartner(req,res){ ensureAdmin(req); const item=await db.findById('partner_organizations',id(req)); if(!item) throw new AppError('Partner not found',404); const allowed=['organization_name','partner_type','primary_contact_name','primary_contact_email','primary_contact_phone','technical_contact_name','technical_contact_email','country','city','address','website','registration_number','tax_id','business_type','verification_status','status']; const updates=Object.fromEntries(Object.entries(req.body).filter(([k])=>allowed.includes(k))); updates.updated_at=new Date(); await db.update('partner_organizations',id(req),updates); return res.json({success:true,data:await db.findById('partner_organizations',id(req))}); }
export async function deletePartner(req,res){ ensureAdmin(req); await db.update('partner_organizations',id(req),{status:'terminated',updated_at:new Date()}); return res.json({success:true}); }

export async function getAPIKeys(req,res){ ensureAdmin(req); const applicationId=req.query.applicationId; const keys=await db.find('api_credentials',applicationId?{application_id:applicationId}:{}); return res.json({success:true,data:keys.map(k=>({...k,api_key:k.api_key?`${k.api_key.slice(0,12)}...`:undefined,api_secret_hash:undefined}))}); }
export async function createAPIKey(req,res){ ensureAdmin(req); const item=await service.generateCredentials(req.body.applicationId,clean(req.body.environment,'sandbox')); return res.status(201).json({success:true,data:item}); }
export async function revokeAPIKey(req,res){ ensureAdmin(req); return res.json({success:true,data:await service.revokeCredentials(id(req))}); }

export async function getWebhooks(req,res){ ensureAdmin(req); const q=req.query.applicationId?{application_id:req.query.applicationId}:{}; return res.json({success:true,data:await db.find('webhook_configs',q,{sort:{created_at:-1}})}); }
export async function getWebhook(req,res){ ensureAdmin(req); const item=await db.findById('webhook_configs',id(req)); if(!item) throw new AppError('Webhook not found',404); return res.json({success:true,data:{...item,secret_key:undefined}}); }
export async function createWebhook(req,res){ ensureAdmin(req); const item=await service.createWebhook(req.body.applicationId,{webhookUrl:req.body.webhookUrl,webhookName:req.body.webhookName,subscribedEvents:req.body.subscribedEvents}); return res.status(201).json({success:true,data:item}); }
export async function updateWebhook(req,res){ ensureAdmin(req); const allowed=['webhook_url','webhook_name','subscribed_events','filter_conditions','allowed_ips','status']; const updates=Object.fromEntries(Object.entries(req.body).filter(([k])=>allowed.includes(k))); updates.updated_at=new Date(); await db.update('webhook_configs',id(req),updates); return res.json({success:true,data:await db.findById('webhook_configs',id(req))}); }
export async function deleteWebhook(req,res){ ensureAdmin(req); return res.json({success:true,data:await service.deleteWebhook(id(req))}); }
export async function testWebhook(req,res){ ensureAdmin(req); const webhook=await db.findById('webhook_configs',id(req)); if(!webhook) throw new AppError('Webhook not found',404); const delivery=await service.deliverWebhook(webhook,'integration.test',{id:crypto.randomUUID(),message:'KAYAD webhook test'}); return res.json({success:true,data:delivery}); }
export async function getWebhookLogs(req,res){ ensureAdmin(req); return res.json({success:true,data:await db.find('webhook_deliveries',{webhook_id:id(req,'webhookId')},{sort:{created_at:-1},limit:100})}); }

export async function getPlugins(req,res){ ensureAdmin(req); return res.json({success:true,data:await db.find('integration_plugins',{})}); }
export async function getPlugin(req,res){ ensureAdmin(req); const item=await db.findById('integration_plugins',id(req)); if(!item) throw new AppError('Plugin not found',404); return res.json({success:true,data:item}); }
export async function createPlugin(req,res){ ensureAdmin(req); const item=await db.create('integration_plugins',{name:req.body.name,code:req.body.code,description:req.body.description,version:req.body.version||'1.0.0',status:'active',config:req.body.config||{},created_at:new Date(),updated_at:new Date()}); return res.status(201).json({success:true,data:item}); }
export async function updatePlugin(req,res){ ensureAdmin(req); await db.update('integration_plugins',id(req),{...req.body,updated_at:new Date()}); return res.json({success:true,data:await db.findById('integration_plugins',id(req))}); }
export async function deletePlugin(req,res){ ensureAdmin(req); await db.update('integration_plugins',id(req),{status:'disabled',updated_at:new Date()}); return res.json({success:true}); }

export async function getTemplates(req,res){ return res.json({success:true,data:await db.find('integration_templates',{status:'active'})}); }
export async function getTemplate(req,res){ const item=await db.findById('integration_templates',id(req)); if(!item) throw new AppError('Integration template not found',404); return res.json({success:true,data:item}); }
export async function getAPIAnalytics(req,res){ ensureAdmin(req); const period=clean(req.query.period,'daily'); const since=period==='monthly'?30:period==='weekly'?7:period==='hourly'?1:1; const logs=await db.find('api_usage_logs',{created_at:{$gte:new Date(Date.now()-since*86400000)}}); const successful=logs.filter(x=>x.status_code>=200&&x.status_code<400).length; return res.json({success:true,data:{period,totalRequests:logs.length,successfulRequests:successful,failedRequests:logs.length-successful,successRate:logs.length?Number((successful/logs.length*100).toFixed(2)):0,avgResponseTimeMs:Math.round(logs.reduce((a,x)=>a+(x.response_time_ms||0),0)/(logs.length||1))}}); }
export async function getSDKs(req,res){ return res.json({success:true,data:await db.find('integration_sdks',{status:'active'})}); }
export async function getOAuthConfig(req,res){ ensureAdmin(req); return res.json({success:true,data:await db.find('oauth_clients',{status:'active'})}); }
export async function createOAuthClient(req,res){ ensureAdmin(req); const secret=crypto.randomBytes(32).toString('hex'); const hash=crypto.createHash('sha256').update(secret).digest('hex'); const item=await db.create('oauth_clients',{client_id:`kayad_${crypto.randomBytes(10).toString('hex')}`,client_secret_hash:hash,name:req.body.name,redirect_uris:req.body.redirectUris||[],scopes:req.body.scopes||[],status:'active',created_at:new Date(),updated_at:new Date()}); return res.status(201).json({success:true,data:{...item,client_secret:secret}}); }
export async function getEvents(req,res){ ensureAdmin(req); return res.json({success:true,data:await db.find('integration_events',{}, {sort:{created_at:-1},limit:100})}); }
export async function getGatewayStatus(req,res){ return res.json({success:true,data:{status:'operational',transport:'canonical-http-client',timestamp:new Date().toISOString()}}); }
export async function getSandbox(req,res){ ensureAdmin(req); const configs=await db.find('sandbox_environments',{status:'active'}); return res.json({success:true,data:configs}); }
export async function getCertificationStatus(req,res){ ensureAdmin(req); return res.json({success:true,data:await db.find('integration_certifications',{})}); }
export async function getIntegrationHelp(req,res){ return res.json({success:true,data:{topic:req.body?.topic||'general',resources:['API catalog','authentication','webhooks','rate limits','sandbox']}}); }
