export const getControlPlaneSnapshot = () => api.get('/command-center/snapshot');
import { api } from '../api/httpClient';


// Mission Control
export const getMissionControl = () => api.get('/command-center/mission-control');
export const getLiveActivity = (params) => api.get('/command-center/live-activity', { params });

// Operations Centers
export const getOperationsCenter = () => api.get('/command-center/operations');
export const getMarketplaceCenter = () => api.get('/command-center/marketplace');
export const getDealerOperations = () => api.get('/command-center/dealers');
export const getAuctionOperations = () => api.get('/command-center/auctions');
export const getInspectionOperations = () => api.get('/command-center/inspections');
export const getFinanceOperations = () => api.get('/command-center/finance');
export const getSupportOperations = () => api.get('/command-center/support');
export const getSecurityOperations = () => api.get('/command-center/security');
export const getInfrastructureOperations = () => api.get('/command-center/infrastructure');
export const getAIOperations = () => api.get('/command-center/ai');

// Actions
export const getPendingActions = () => api.get('/command-center/actions');
export const executeAction = (data) => api.post('/command-center/actions/execute', data);

// Notifications
export const getNotifications = () => api.get('/command-center/notifications');
export const markNotificationRead = (notificationId) => api.put(`/command-center/notifications/${notificationId}/read`);

// Decisions
export const getDecisions = () => api.get('/command-center/decisions');

// Command Palette
export const getCommands = () => api.get('/command-center/commands');
export const executeCommand = (data) => api.post('/command-center/commands/execute', data);

// War Room
export const getWarRoom = () => api.get('/command-center/war-room');
export const activateWarRoom = (data) => api.post('/command-center/war-room/activate', data);
export const deactivateWarRoom = () => api.post('/command-center/war-room/deactivate');

// Timeline
export const getExecutiveTimeline = (params) => api.get('/command-center/timeline', { params });

// Briefing
export const getExecutiveBriefing = () => api.get('/command-center/briefing');

// Search
export const enterpriseSearch = (params) => api.get('/command-center/search', { params });

// Widgets
export const getWidgets = () => api.get('/command-center/widgets');
export const saveWidgetLayout = (data) => api.post('/command-center/widgets/layout', data);

// Regional Map
export const getRegionalMap = () => api.get('/command-center/map');

