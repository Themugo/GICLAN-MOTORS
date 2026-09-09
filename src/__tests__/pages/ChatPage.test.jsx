import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ChatView from '../../features/ChatView';

vi.mock('../../services/chatApi', () => ({
  getMyChats: vi.fn().mockResolvedValue([]),
  getChatMessages: vi.fn().mockResolvedValue([]),
  sendChatMessage: vi.fn(),
  markChatSeen: vi.fn(),
  mapBackendChatToThread: vi.fn(),
  mapBackendMessagesToUnified: vi.fn(),
  ChatApiError: class ChatApiError extends Error {},
}));

describe('Canonical ChatView', () => {
  afterEach(() => cleanup());
  it('renders the unified communication surface', async () => {
    render(<ChatView user={{ id: 'u1', name: 'Test User', role: 'buyer' }} />);
    expect(await screen.findByText(/messages/i)).toBeInTheDocument();
  });
});
