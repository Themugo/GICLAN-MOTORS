import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import VirtualList from '../components/VirtualList';

// Message status: 'sending' | 'sent' | 'delivered' | 'read'
function MessageRow({ msg, isMine, showDate, formatDate, formatTime }) {
  const statusIcon = useMemo(() => {
    if (!isMine) return null;
    if (msg.status === 'sending') return '○';
    if (msg.status === 'delivered' || msg.seen) return '✓✓';
    return '✓';
  }, [isMine, msg.status, msg.seen]);

  return (
    <div>
      {showDate && (
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', margin: '8px 0' }}>
          {formatDate(msg.createdAt)}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
        <div>
          <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
            {msg.message || msg.content || msg.text}
            {msg.isDeliveryConfirmation && (
              <div style={{
                marginTop: 8,
                padding: '8px 10px',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: 6,
                border: '1px solid rgba(34, 197, 94, 0.2)',
                fontSize: 11,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>
                  🚗 Delivery Confirmation
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  {msg.deliveryDetails || 'Please confirm you have received the vehicle in good condition.'}
                </div>
                {!msg.confirmed && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-sm btn-gold"
                      onClick={() => msg.onConfirmDelivery?.(msg._id, true)}
                    >
                      ✓ Confirm Received
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => msg.onConfirmDelivery?.(msg._id, false)}
                    >
                      Report Issue
                    </button>
                  </div>
                )}
                {msg.confirmed && (
                  <div style={{ marginTop: 6, color: 'var(--green)', fontWeight: 600 }}>
                    ✓ {msg.confirmedBy === 'buyer' ? 'You confirmed' : 'Seller confirmed'} delivery
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, textAlign: isMine ? 'right' : 'left', display: 'flex', alignItems: 'center', gap: 4 }}>
            {formatTime(msg.createdAt)}
            {statusIcon && (
              <span style={{ color: msg.seen ? 'var(--blue)' : 'var(--text-dim)' }}>{statusIcon}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const MemoizedMessageRow = MessageRow;

export default function ChatPage() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { joinMessages, leaveChannel, socket } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [chats, setChats]     = useState([]);
  const [active, setActive]   = useState(chatId || null);
  const [messages, setMessages] = useState([]);
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    chatAPI.inbox().then(d => {
      if (mountedRef.current) setChats(d.chats || d.data || []);
    }).catch(() => {}).finally(() => { if (mountedRef.current) setLoading(false); });
  }, []);

  useEffect(() => {
    if (!active) return;
    chatAPI.messages(active).then(d => {
      if (mountedRef.current) setMessages(d.messages || d.data || []);
      chatAPI.seen(active).catch(() => {});
    }).catch(() => {});
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket.io real-time: message status updates
  useEffect(() => {
    if (!socket?.connected || !active) return;

    const handleMessageDelivered = (data) => {
      if (!mountedRef.current) return;
      if (data.chatId === active) {
        setMessages(prev => prev.map(m =>
          m._id === data.messageId ? { ...m, status: 'delivered' } : m
        ));
      }
    };

    const handleMessageRead = (data) => {
      if (!mountedRef.current) return;
      if (data.chatId === active) {
        setMessages(prev => prev.map(m =>
          m._id === data.messageId ? { ...m, seen: true, status: 'read' } : m
        ));
      }
    };

    const handleDeliveryRequest = (data) => {
      if (!mountedRef.current) return;
      if (data.chatId === active || data.recipientId === user?.id) {
        const deliveryMsg = {
          _id: `delivery-${Date.now()}`,
          message: 'Delivery confirmation requested',
          isDeliveryConfirmation: true,
          deliveryDetails: data.details || 'Please confirm you have received the vehicle.',
          escrowId: data.escrowId,
          confirmed: false,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, deliveryMsg]);
        toast.info('🚗 Delivery confirmation requested');
      }
    };

    const handleDeliveryConfirmed = (data) => {
      if (!mountedRef.current) return;
      if (data.chatId === active) {
        setMessages(prev => prev.map(m =>
          m._id === data.messageId ? { ...m, confirmed: true, confirmedBy: data.confirmedBy } : m
        ));
        toast.success(`✓ Delivery confirmed by ${data.confirmedBy}`);
      }
    };

    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:read', handleMessageRead);
    socket.on('delivery:requested', handleDeliveryRequest);
    socket.on('delivery:confirmed', handleDeliveryConfirmed);

    return () => {
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:read', handleMessageRead);
      socket.off('delivery:requested', handleDeliveryRequest);
      socket.off('delivery:confirmed', handleDeliveryConfirmed);
    };
  }, [socket, active, user?.id, toast]);

  // Join chat channel for new messages
  useEffect(() => {
    if (!active) return;
    const ch = joinMessages(active, {
      onMessage: (msg) => {
        if (!mountedRef.current) return;
        setMessages(prev => [...prev, msg]);
        chatAPI.seen(active).catch(() => {});
      },
    });
    channelRef.current = ch;
    return () => {
      if (ch) leaveChannel(ch);
      channelRef.current = null;
    };
  }, [active, joinMessages, leaveChannel]);

  // Handle delivery confirmation
  const handleConfirmDelivery = useCallback(async (messageId, confirmed) => {
    const currentChat = chats.find(c => c._id === active);
    const escrowId = currentChat?.escrowId;

    if (!escrowId) {
      toast.error('No escrow associated with this chat');
      return;
    }

    try {
      if (confirmed) {
        await chatAPI.confirmDelivery(active, { messageId, escrowId });
        setMessages(prev => prev.map(m =>
          m._id === messageId ? { ...m, confirmed: true, confirmedBy: user?.role === 'dealer' ? 'seller' : 'buyer' } : m
        ));
        toast.success('✓ Delivery confirmed!');
      } else {
        toast.info('Please contact support to report any issues');
      }
    } catch {
      toast.error('Failed to confirm delivery');
    }
  }, [active, chats, user, toast]);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (!text.trim() || !active || sending) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    try {
      const data = await chatAPI.send(active, { message: msg });
      if (mountedRef.current) setMessages(prev => [...prev, data.message || data]);
    } catch { toast('Failed to send message', 'error'); if (mountedRef.current) setText(msg); }
    finally { if (mountedRef.current) setSending(false); }
  }, [text, active, sending, toast]);

  const formatTime = useCallback((iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const formatDate = useCallback((iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  }, []);

  const activeChat = useMemo(() => chats.find(c => c._id === active), [chats, active]);

  const otherParticipant = useCallback((p) => {
    const participants = p.participants || [];
    return participants.find(u => u._id !== user?.id) || participants[0];
  }, [user]);

  const messageItems = useMemo(() => messages.map((msg, i) => ({
    key: msg._id || i,
    msg: { ...msg, onConfirmDelivery: handleConfirmDelivery },
    isMine: msg.sender === user?.id || msg.sender?._id === user?.id,
    showDate: i === 0 || formatDate(messages[i - 1]?.createdAt) !== formatDate(msg.createdAt),
    formatDate,
    formatTime,
  })), [messages, user, formatDate, formatTime, handleConfirmDelivery]);

  const renderMessage = useCallback((item) => (
    <MemoizedMessageRow
      msg={item.msg}
      isMine={item.isMine}
      showDate={item.showDate}
      formatDate={formatDate}
      formatTime={formatTime}
    />
  ), [formatDate, formatTime]);

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="chat-layout grid-sidebar-chat" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem' }}>💬 Messages</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {chats.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No conversations yet
              </div>
            ) : chats.map(chat => {
              const other = otherParticipant(chat);
              const isActive = chat._id === active;
              return (
                <div
                  key={chat._id}
                  onClick={() => { setActive(chat._id); navigate(`/chat/${chat._id}`, { replace: true }); }}
                  style={{
                    padding: '14px 20px',
                    cursor: 'pointer',
                    background: isActive ? 'var(--gold-glow)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? 'var(--gold)' : 'transparent'}`,
                    borderBottom: '1px solid var(--border)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--gold)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 14, color: '#0A1628', fontWeight: 700,
                      }}>
                        {(other?.name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{other?.name || 'User'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {chat.lastMessage?.message || chat.car?.title || 'Start a conversation'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      {chat.lastMessage?.createdAt && (
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                          {formatTime(chat.lastMessage.createdAt)}
                        </span>
                      )}
                      {chat.unreadCount > 0 && (
                        <span style={{
                          background: 'var(--gold)', color: '#0A1628',
                          borderRadius: '50%', width: 18, height: 18,
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{chat.unreadCount}</span>
                      )}
                    </div>
                  </div>
                  {chat.car && (
                    <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, marginLeft: 48 }}>
                      🚗 {chat.car.title}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {active ? (
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
              {activeChat && (() => {
                const other = otherParticipant(activeChat);
                return (
                  <>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#0A1628', fontWeight: 700 }}>
                      {(other?.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{other?.name}</div>
                      {activeChat.car && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Re: {activeChat.car.title}</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <VirtualList
                items={messageItems}
                itemHeight={72}
                gap={4}
                renderItem={renderMessage}
                className="chat-messages-scroll"
              />
            </div>

            <form onSubmit={handleSend} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 10 }}>
              <input
                className="input"
                placeholder="Type a message..."
                value={text}
                onChange={e => setText(e.target.value)}
                style={{ flex: 1 }}
                autoComplete="off"
              />
              <button className="btn btn-gold" type="submit" disabled={!text.trim() || sending}>
                {sending ? '...' : 'Send'}
              </button>
            </form>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose from your existing chats or start a new one from a car listing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
