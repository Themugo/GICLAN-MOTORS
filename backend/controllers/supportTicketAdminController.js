// Canonical support-ticket controller compatibility facade.
// All ticket operations now live in supportController.js.
export {
  getAllTickets,
  getTicket as getTicketById,
  updateTicketStatus,
  assignTicket,
  addMessage as addTicketMessage,
  getTicketStats,
} from "./supportController.js";
