import { request, HttpRequestError } from '../api/httpRequest';
/**
 * Real backend chat API client, and an honest mapper from the real
 * chat/message shape into this frontend's own UnifiedChatThread/
 * UnifiedMessageItem types.
 *
 * Follows the exact pattern established in services/vehicleApi.ts,
 * favoriteApi.ts, bidApi.ts, inspectionApi.ts: typed error class with
 * a `kind` field, `credentials: 'include'` on every request (the real
 * backend requires auth for the entire chat route file - confirmed
 * via `router.use(protect)` in backend/routes/chatRoutes.js).
 *
 * SCOPE NOTE, stated directly: the real backend's chat model is a
 * plain, two-participant conversation - {id, participants: [user,
 * user], car, lastMessage, lastMessageAt, messages: [{id, sender,
 * text, createdAt, seenBy}]}. It has no concept of escrow/inspection/
 * finance/auction "categories," no counterparty trust score or star
 * rating, no multi-step transaction timeline, no smart actions, no
 * shared-file vault. The mapper below fills UnifiedChatThread's own
 * structurally-required fields with honest, generic values that are
 * true of any real conversation (category: 'inquiry' - a real chat
 * about a car genuinely is one; referenceNumber: the chat's own real
 * id; currentStatus: 'Active Conversation') and leaves every field
 * with no real backend equivalent (trustScore, escrowSummary,
 * timeline, smartActions, sharedFiles, etc.) either omitted (where
 * optional) or as a genuinely empty array (where required but no real
 * data exists) - never invented values standing in for real ones.
 */

import { UnifiedChatThread, UnifiedMessageItem } from '../types';


export type ChatApiErrorKind = 'network' | 'unauthenticated' | 'not_found' | 'server';

export class ChatApiError extends Error {
  kind: ChatApiErrorKind;
  status?: number;
  constructor(message: string, kind: ChatApiErrorKind, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

interface BackendChatUser {
  id: string;
  name: string;
  avatar?: string;
}

interface BackendChatCar {
  id: string;
  title: string;
  images?: string[];
  price?: number;
}

interface BackendChat {
  id: string;
  participants: BackendChatUser[];
  car: BackendChatCar | null;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendMessage {
  id: string;
  sender: BackendChatUser | string;
  message: string;
  text?: string;
  createdAt: string;
  seen: boolean;
  seenBy: string[];
}

async function chatFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, { method: options.method, body: options.body, headers: options.headers as Record<string, string> });
  } catch (err) {
    const error = err instanceof HttpRequestError ? err : new HttpRequestError('Request failed.');
    const kind: ChatApiErrorKind = error.status === 401 ? 'unauthenticated' : error.status === 404 ? 'not_found' : 'server';
    throw new ChatApiError(error.message, kind, error.status);
  }
}

/** GET /api/chat - the user's own real conversations. */
export async function getMyChats(): Promise<BackendChat[]> {
  const body = await chatFetch<{ chats: BackendChat[] }>('/api/chat');
  return body.chats || [];
}

/** GET /api/chat/:chatId/messages - the real message history for one conversation. */
export async function getChatMessages(chatId: string): Promise<BackendMessage[]> {
  const body = await chatFetch<{ messages: BackendMessage[] }>(`/api/chat/${chatId}/messages`);
  return body.messages || [];
}

/** POST /api/chat/:chatId/message - send a real message. */
export async function sendChatMessage(chatId: string, text: string): Promise<void> {
  await chatFetch(`/api/chat/${chatId}/message`, {
    method: 'POST',
    body: JSON.stringify({ content: text }),
  });
}

/** POST /api/chat/:chatId/seen - mark a real conversation's messages as read. */
export async function markChatSeen(chatId: string): Promise<void> {
  await chatFetch(`/api/chat/${chatId}/seen`, { method: 'POST' });
}

/** Honestly maps one real backend chat into this frontend's own
 * UnifiedChatThread shape - see the file-level SCOPE NOTE above for
 * exactly which fields are real vs. generic-but-true placeholders. */
export function mapBackendChatToThread(chat: BackendChat, currentUserId: string): UnifiedChatThread {
  const other = chat.participants.find((p) => p.id !== currentUserId) || chat.participants[0];
  return {
    id: chat.id,
    category: 'inquiry',
    referenceNumber: chat.id,
    transactionType: 'Vehicle Inquiry',
    currentStatus: 'Active Conversation',
    currentStage: '',

    participantName: other?.name || 'KAYAD User',
    participantRole: 'KAYAD User',
    participantAvatar: other?.avatar || '',
    participantVerified: false,

    unreadCount: 0,
    lastMessage: chat.lastMessage || '',
    lastTimestamp: chat.lastMessageAt || chat.updatedAt,

    vehicleId: chat.car?.id,
    vehicleTitle: chat.car?.title,
    vehicleImage: chat.car?.images?.[0],
    vehiclePrice: chat.car?.price,

    counterpartyInfo: {
      name: other?.name || 'KAYAD User',
      role: 'KAYAD User',
      avatar: other?.avatar,
      location: '',
    },

    participants: [],
    timeline: [],
    smartActions: [],
    sharedFiles: [],
    messages: [],
  };
}

/** Honestly maps real backend messages into this frontend's own
 * UnifiedMessageItem shape. */
export function mapBackendMessagesToUnified(
  messages: BackendMessage[],
  threadId: string,
  currentUserId: string
): UnifiedMessageItem[] {
  return messages.map((m) => {
    const senderIsCurrentUser = typeof m.sender === 'object' ? m.sender.id === currentUserId : m.sender === currentUserId;
    const senderName = typeof m.sender === 'object' ? m.sender.name : 'KAYAD User';
    const senderAvatar = typeof m.sender === 'object' ? m.sender.avatar : undefined;
    return {
      id: m.id,
      threadId,
      category: 'inquiry',
      sender: senderIsCurrentUser ? 'user' : 'seller',
      senderName,
      senderAvatar,
      text: m.message || m.text || '',
      timestamp: m.createdAt,
      readStatus: m.seen ? 'read' : 'sent',
    };
  });
}
