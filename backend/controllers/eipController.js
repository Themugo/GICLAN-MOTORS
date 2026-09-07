// Enterprise Integration Platform API boundary.
// Integration registry/partner/webhook/plugin/sandbox/certification data must
// come from real persisted configuration or a configured external service.
// Until those contracts exist, every endpoint fails closed.

function notConfigured(res, domain = "Integration") {
  return res.status(501).json({
    success: false,
    error: `${domain} data/service is not configured`,
    code: "INTEGRATION_NOT_CONFIGURED",
  });
}

export async function getAPIs(req, res) { return notConfigured(res, "API catalog"); }
export async function getAPIDetails(req, res) { return notConfigured(res, "API catalog"); }
export async function getPartners(req, res) { return notConfigured(res, "Integration partners"); }
export async function getPartner(req, res) { return notConfigured(res, "Integration partners"); }
export async function createPartner(req, res) { return notConfigured(res, "Integration partners"); }
export async function updatePartner(req, res) { return notConfigured(res, "Integration partners"); }
export async function deletePartner(req, res) { return notConfigured(res, "Integration partners"); }
export async function getAPIKeys(req, res) { return notConfigured(res, "API key management"); }
export async function createAPIKey(req, res) { return notConfigured(res, "API key management"); }
export async function revokeAPIKey(req, res) { return notConfigured(res, "API key management"); }
export async function getWebhooks(req, res) { return notConfigured(res, "Webhook registry"); }
export async function getWebhook(req, res) { return notConfigured(res, "Webhook registry"); }
export async function createWebhook(req, res) { return notConfigured(res, "Webhook registry"); }
export async function updateWebhook(req, res) { return notConfigured(res, "Webhook registry"); }
export async function deleteWebhook(req, res) { return notConfigured(res, "Webhook registry"); }
export async function testWebhook(req, res) { return notConfigured(res, "Webhook delivery"); }
export async function getWebhookLogs(req, res) { return notConfigured(res, "Webhook logs"); }
export async function getPlugins(req, res) { return notConfigured(res, "Plugin registry"); }
export async function getPlugin(req, res) { return notConfigured(res, "Plugin registry"); }
export async function createPlugin(req, res) { return notConfigured(res, "Plugin registry"); }
export async function updatePlugin(req, res) { return notConfigured(res, "Plugin registry"); }
export async function deletePlugin(req, res) { return notConfigured(res, "Plugin registry"); }
export async function getTemplates(req, res) { return notConfigured(res, "Integration templates"); }
export async function getTemplate(req, res) { return notConfigured(res, "Integration templates"); }
export async function getAPIAnalytics(req, res) { return notConfigured(res, "Integration analytics"); }
export async function getSDKs(req, res) { return notConfigured(res, "SDK registry"); }
export async function getOAuthConfig(req, res) { return notConfigured(res, "OAuth configuration"); }
export async function createOAuthClient(req, res) { return notConfigured(res, "OAuth client management"); }
export async function getEvents(req, res) { return notConfigured(res, "Integration events"); }
export async function getGatewayStatus(req, res) { return notConfigured(res, "Gateway telemetry"); }
export async function getSandbox(req, res) { return notConfigured(res, "Sandbox environment"); }
export async function getCertificationStatus(req, res) { return notConfigured(res, "Certification service"); }
export async function getIntegrationHelp(req, res) { return notConfigured(res, "Integration assistance"); }
export async function getIntegrationDashboard(req, res) { return notConfigured(res, "Integration telemetry"); }
