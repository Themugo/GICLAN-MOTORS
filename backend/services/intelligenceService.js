import { count, findAll, findOne, create, update } from '../db/index.js';
import { getExecutiveAnalytics, getSalesAnalytics } from './executiveAnalytics.service.js';

const DAY = 86400000;
const clampDays = (v) => Math.min(Math.max(Number(v) || 30, 7), 365);
const n = (v) => Number(v) || 0;
const sum = (rows, f) => rows.reduce((a, r) => a + n(r[f]), 0);
const date = (d) => new Date(d || 0);
const safeId = (v) => String(v || '').trim();
const percent = (a,b) => b ? (a / b) * 100 : 0;

async function eventsWindow(days) {
  const end = new Date(); const start = new Date(end.getTime() - days * DAY);
  return findAll('events', { filters: { createdAt: { $gte: start.toISOString() } }, limit: 50000 });
}

export async function dashboard(days = 30) { return getExecutiveAnalytics({ days: clampDays(days) }); }

export async function marketplace(days = 30) {
  const d = await dashboard(days);
  return { periodDays:d.periodDays, listings:d.listings, bids:d.bids, conversion:d.conversion, activity:d.activity, gmv:d.gmv };
}

export async function dealers(days = 30) {
  const safe = clampDays(days); const start = new Date(Date.now()-safe*DAY).toISOString();
  const [cars, dealersCount] = await Promise.all([
    findAll('cars',{filters:{createdAt:{$gte:start}},select:'id dealerId dealer_id status views clicks price createdAt',limit:30000}),
    count('dealers')
  ]);
  const map = new Map();
  for (const c of cars) { const id=safeId(c.dealerId||c.dealer_id); if(!id) continue; const x=map.get(id)||{dealerId:id,listings:0,sold:0,views:0,clicks:0,inventoryValue:0}; x.listings++; x.sold+=c.status==='sold'?1:0; x.views+=n(c.views); x.clicks+=n(c.clicks); x.inventoryValue+=n(c.price); map.set(id,x); }
  const rows=[...map.values()].sort((a,b)=>b.sold-a.sold||b.views-a.views);
  return {periodDays:safe,totalDealers:dealersCount,performance:rows.slice(0,50),totals:{listings:cars.length,sold:rows.reduce((a,x)=>a+x.sold,0)}};
}

export async function auctions(days=30) {
  const safe=clampDays(days), start=new Date(Date.now()-safe*DAY).toISOString();
  const [auctions,bids]=await Promise.all([
    findAll('auctions',{filters:{createdAt:{$gte:start}},limit:20000}),
    findAll('bids',{filters:{createdAt:{$gte:start}},select:'id amount createdAt carId car',limit:50000})
  ]);
  return {periodDays:safe,auctions:{created:auctions.length,active:auctions.filter(a=>['active','open','running'].includes(String(a.status).toLowerCase())).length,completed:auctions.filter(a=>['completed','ended','closed'].includes(String(a.status).toLowerCase())).length},bids:{count:bids.length,value:sum(bids,'amount'),average:bids.length?sum(bids,'amount')/bids.length:0}};
}

export async function finance(days=30) {
  const safe=clampDays(days), start=new Date(Date.now()-safe*DAY).toISOString();
  const [payments,escrows]=await Promise.all([
    findAll('payments',{filters:{createdAt:{$gte:start}},select:'id amount status type createdAt',limit:50000}),
    findAll('escrows',{filters:{createdAt:{$gte:start}},select:'id amount status createdAt',limit:30000})
  ]);
  const successful=payments.filter(p=>['success','successful','completed'].includes(String(p.status).toLowerCase()));
  const released=escrows.filter(e=>e.status==='released');
  return {periodDays:safe,payments:{count:payments.length,successful:successful.length,successfulValue:sum(successful,'amount')},escrow:{created:escrows.length,released:released.length,releasedValue:sum(released,'amount')},source:'live_payments_and_escrows'};
}

export async function inspections(days=30) {
  const safe=clampDays(days), start=new Date(Date.now()-safe*DAY).toISOString();
  const rows=await findAll('inspections',{filters:{createdAt:{$gte:start}},select:'id status providerId provider_id createdAt',limit:30000});
  const byStatus={}; for(const r of rows){const s=String(r.status||'unknown').toLowerCase();byStatus[s]=(byStatus[s]||0)+1;}
  return {periodDays:safe,total:rows.length,byStatus,completed:rows.filter(r=>['completed','complete'].includes(String(r.status).toLowerCase())).length};
}

export async function marketing(days=30) {
  const rows=await eventsWindow(clampDays(days)); const types={}; for(const e of rows){const t=String(e.eventType||e.type||'unknown');types[t]=(types[t]||0)+1;}
  const relevant=Object.entries(types).filter(([k])=>/campaign|marketing|lead|ad|click|impression/i.test(k));
  return {periodDays:clampDays(days),events:relevant.sort((a,b)=>b[1]-a[1]).map(([eventType,count])=>({eventType,count})),totalEvents:rows.length};
}

export async function customers(days=30) {
  const rows=await eventsWindow(clampDays(days)); const active=new Set(rows.map(e=>e.userId||e.user||e.actorId).filter(Boolean));
  const counts={}; for(const e of rows){const t=String(e.eventType||e.type||'unknown');counts[t]=(counts[t]||0)+1;}
  return {periodDays:clampDays(days),activeUsers:active.size,eventCount:rows.length,topEvents:Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([eventType,count])=>({eventType,count}))};
}

export async function countries() {
  const rows=await findAll('users',{select:'id country countryCode country_code createdAt',limit:50000}); const map=new Map();
  for(const u of rows){const c=String(u.country||u.countryCode||u.country_code||'Unknown').trim()||'Unknown'; map.set(c,(map.get(c)||0)+1);}
  return {totalUsers:rows.length,distribution:[...map.entries()].sort((a,b)=>b[1]-a[1]).map(([country,users])=>({country,users}))};
}

export async function revenue(days=30) { const d=await dashboard(days); return {periodDays:d.periodDays,gmv:d.gmv,revenue:d.revenue}; }

export async function forecasts(days=30) {
  const d=await dashboard(days); const series=d.trends.dailyGmv||[]; const values=series.map(x=>n(x.value));
  if(values.length<2) return {method:'insufficient-history',periodDays:d.periodDays,horizonDays:7,forecast:null};
  const mean=values.reduce((a,b)=>a+b,0)/values.length; const xs=values.map((_,i)=>i); const xm=(values.length-1)/2; const ym=mean; const denom=xs.reduce((a,x)=>a+(x-xm)**2,0)||1; const slope=xs.reduce((a,x,i)=>a+(x-xm)*(values[i]-ym),0)/denom; const intercept=ym-slope*xm;
  const forecast=Array.from({length:7},(_,i)=>Math.max(0,intercept+slope*(values.length+i)));
  return {method:'linear-trend-on-observed-daily-released-escrow-value',periodDays:d.periodDays,horizonDays:7,forecast,confidence:'directional-not-statistical',observations:values.length};
}

export async function insights(days=30) {
  const d=await dashboard(days); const out=[];
  if(d.conversion.viewToLeadPercent<2) out.push({severity:'high',area:'conversion',message:'View-to-lead conversion is below 2%; investigate listing quality and lead capture.'});
  if(d.gmv.growthPercent<0) out.push({severity:'medium',area:'gmv',message:'Today GMV is below yesterday; review active inventory, demand and payment completion.'});
  if(d.activity.activeEscrows>0) out.push({severity:'info',area:'escrow',message:`${d.activity.activeEscrows} escrow(s) are currently held and should remain under custody controls.`});
  if(!out.length) out.push({severity:'info',area:'platform',message:'No threshold breach detected in the selected live metrics.'});
  return {periodDays:d.periodDays,insights:out,methodology:'deterministic rules over live operational metrics'};
}

export async function benchmarks(days=30) {
  const d=await dealers(days); const rows=d.performance; const avg=(f)=>rows.length?rows.reduce((a,x)=>a+n(x[f]),0)/rows.length:0;
  return {periodDays:d.periodDays,scope:'internal-dealer-cohort',sampleSize:rows.length,metrics:{averageListings:avg('listings'),averageSold:avg('sold'),averageViews:avg('views'),averageClicks:avg('clicks')},note:'Internal descriptive benchmark; not an external industry benchmark.'};
}

export async function createReport({type='executive',days=30,createdBy,title}) {
  const data = type==='sales' ? await getSalesAnalytics({days:clampDays(days)}) : await dashboard(days);
  return create('intelligence_reports',{type,title:title||`${type} report`,periodDays:clampDays(days),payload:data,createdBy,status:'generated',generatedAt:new Date().toISOString()});
}
export async function reports(limit=50) { return findAll('intelligence_reports',{orderBy:'createdAt',ascending:false,limit:Math.min(Math.max(Number(limit)||50,1),100),select:'id type title periodDays status createdBy generatedAt createdAt'}); }
export async function report(id) { return findOne('intelligence_reports',{id}); }
export async function query(queryText,days=30) {
  const q=String(queryText||'').trim().toLowerCase(); if(!q) throw Object.assign(new Error('query is required'),{statusCode:400});
  if(/revenue|gmv|income/.test(q)) return revenue(days); if(/dealer/.test(q)) return dealers(days); if(/auction|bid/.test(q)) return auctions(days); if(/inspection/.test(q)) return inspections(days); if(/customer|user/.test(q)) return customers(days); if(/country/.test(q)) return countries(); if(/forecast|predict/.test(q)) return forecasts(days); if(/benchmark/.test(q)) return benchmarks(days); if(/marketing|campaign|lead/.test(q)) return marketing(days); if(/finance|payment|escrow/.test(q)) return finance(days); if(/insight|risk/.test(q)) return insights(days); return dashboard(days);
}
export async function scheduled(actorId) { return findAll('intelligence_scheduled_reports',{filters:{createdBy:actorId},orderBy:'createdAt',ascending:false,limit:100}); }
export async function createSchedule(data) { return create('intelligence_scheduled_reports',data); }
