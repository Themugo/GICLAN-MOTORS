import { getSupabase } from "../utils/supabase.js";
import { logError, logInfo } from "../utils/logger.js";
let handle=null;
const enabled=process.env.DEALER_SUBSCRIPTION_EXPIRY_CRON_ENABLED !== "false";
export const startDealerSubscriptionExpiryCron=()=>{
 if(!enabled||handle) return handle;
 const run=async()=>{try{const {data,error}=await getSupabase().rpc("kayad_expire_dealer_subscriptions_atomic"); if(error) throw error; if(Number(data)>0) logInfo("Dealer subscription expiry sweep",{expired:Number(data)});}catch(e){logError("Dealer subscription expiry sweep failed",e);}};
 run(); handle=setInterval(run,60*60*1000); return handle;
};
export const stopDealerSubscriptionExpiryCron=()=>{if(handle){clearInterval(handle);handle=null;}};
