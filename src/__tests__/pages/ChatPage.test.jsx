import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatPage from '../../pages/Chat';

vi.mock('../../api/api', () => ({
  chatAPI: {
    inbox: vi.fn().mockResolvedValue({ chats: [] }),
    messages: vi.fn().mockResolvedValue({ messages: [] }),
    send: vi.fn().mockResolvedValue({ message: { _id: 'msg-1', text: 'Test message' } }),
    seen: vi.fn().mockResolvedValue({}),
    confirmDelivery: vi.fn().mockResolvedValue({}),
    start: vi.fn(),
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u1', name: 'TestUser', role: 'buyer' }, isAuth: true }),
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({
    emit: vi.fn(),
    connected: true,
    socket: { connected: true },
    joinMessages: vi.fn().mockReturnValue('channel-1'),
    leaveChannel: vi.fn(),
  }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

describe('ChatPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders messages heading', async () => {
    render(<MemoryRouter><ChatPage /></MemoryRouter>);
    expect(await screen.findByText('Messages')).toBeInTheDocument();
  });

  it('shows empty state when no chat selected', async () => {
    render(<MemoryRouter><ChatPage /></MemoryRouter>);
    expect(await screen.findByText('Select a conversation')).toBeInTheDocument();
  });

  it('shows empty state prompt', async () => {
    render(<MemoryRouter><ChatPage /></MemoryRouter>);
    expect(await screen.findByText('Choose a conversation to start messaging')).toBeInTheDocument();
  });

  describe('Chat API integration', () => {
    it('loads inbox on mount', async () => {
      const { chatAPI } = await import('../../api/api');

      render(<MemoryRouter><ChatPage /></MemoryRouter>);

      await waitFor(() => {
        expect(chatAPI.inbox).toHaveBeenCalled();
      });
    });
  });
});
