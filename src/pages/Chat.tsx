import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Phone, MoreVertical, Search, ArrowLeft, Image, Loader2 } from 'lucide-react';
import { formatKES } from '../utils/helpers';
import { chatAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
  read: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  car?: {
    title: string;
    price: number;
    image: string;
  };
}

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find(c => c.id === selectedId);

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        const data = await chatAPI.inbox();
        // Transform API response to Conversation format
        const convs: Conversation[] = (data.chats || data || []).map((chat: any) => ({
          id: chat._id || chat.id,
          name: chat.otherUser?.name || chat.name || 'Unknown',
          avatar: chat.otherUser?.avatar,
          lastMessage: chat.lastMessage?.text || chat.lastMessage || '',
          time: chat.lastMessage?.createdAt ? timeAgo(chat.lastMessage.createdAt) : '',
          unread: chat.unreadCount || 0,
          online: chat.otherUser?.online || false,
          car: chat.car ? {
            title: chat.car.title || chat.car.name,
            price: chat.car.price,
            image: chat.car.images?.[0] || chat.car.image,
          } : undefined,
        }));
        setConversations(convs);
        if (convs.length > 0 && !selectedId) {
          setSelectedId(convs[0].id);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, []);

  // Load messages when conversation selected
  useEffect(() => {
    if (!selectedId) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = await chatAPI.messages(selectedId, { limit: 50 });
        const msgs: Message[] = (data.messages || data || []).map((msg: any) => ({
          id: msg._id || msg.id,
          sender: msg.senderId === user?.id ? 'me' : 'them',
          text: msg.text || msg.content,
          time: formatMessageTime(msg.createdAt),
          read: msg.read || false,
        }));
        setMessages(msgs);
        // Mark as seen
        chatAPI.seen(selectedId).catch(console.error);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [selectedId, user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || !selectedId) return;
    setSending(true);
    try {
      await chatAPI.send(selectedId, { text: message });
      // Optimistically add message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'me',
        text: message,
        time: formatMessageTime(new Date().toISOString()),
        read: false,
      }]);
      setMessage('');
      // Update conversation last message
      setConversations(prev => prev.map(c =>
        c.id === selectedId
          ? { ...c, lastMessage: message, unread: 0 }
          : c
      ));
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-cream-50 pt-16 flex">
      {/* Conversations List */}
      <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-cream-200 flex flex-col ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-cream-200">
          <h1 className="font-serif text-xl text-charcoal-900 font-bold mb-3">Messages</h1>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-cream-200 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-400 outline-none focus:border-gold-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-warm-400 text-sm">No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`w-full p-4 flex gap-3 hover:bg-cream-50 transition-colors text-left border-b border-cream-100 ${
                selectedId === conv.id ? 'bg-gold-500/5' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 bg-cream-200 rounded-full flex items-center justify-center text-charcoal-800 font-bold">
                  {conv.name.charAt(0)}
                </div>
                {conv.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm font-semibold text-charcoal-900 truncate">{conv.name}</span>
                  <span className="font-sans text-xs text-warm-400 flex-shrink-0">{conv.time}</span>
                </div>
                <p className="font-sans text-xs text-warm-500 truncate mt-0.5">{conv.lastMessage}</p>
                {conv.car && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-cream-50 rounded-lg">
                    <img src={conv.car.image} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-[10px] text-charcoal-800 truncate">{conv.car.title}</p>
                      <p className="font-sans text-[10px] text-gold-600 font-semibold">{formatKES(conv.car.price)}</p>
                    </div>
                  </div>
                )}
                {conv.unread > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-gold-500 text-white text-[10px] font-bold rounded-full mt-1">
                    {conv.unread}
                  </span>
                )}
              </div>
            </button>
          ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-cream-200 flex items-center gap-3">
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden p-2 hover:bg-cream-100 rounded-lg"
              >
                <ArrowLeft size={20} className="text-charcoal-800" />
              </button>
              <div className="w-10 h-10 bg-cream-200 rounded-full flex items-center justify-center text-charcoal-800 font-bold">
                {selectedConversation.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-sans text-sm font-semibold text-charcoal-900">{selectedConversation.name}</p>
                <p className="font-sans text-xs text-emerald-500 flex items-center gap-1">
                  {selectedConversation.online ? 'Online' : 'Offline'}
                </p>
              </div>
              <button className="p-2 hover:bg-cream-100 rounded-lg">
                <Phone size={18} className="text-charcoal-600" />
              </button>
              <button className="p-2 hover:bg-cream-100 rounded-lg">
                <MoreVertical size={18} className="text-charcoal-600" />
              </button>
            </div>

            {/* Car info banner */}
            {selectedConversation.car && (
              <div className="px-4 py-3 bg-cream-50 border-b border-cream-200 flex items-center gap-3">
                <img src={selectedConversation.car.image} alt="" loading="lazy" decoding="async" className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-xs text-charcoal-800 font-semibold truncate">{selectedConversation.car.title}</p>
                  <p className="font-sans text-xs text-gold-600 font-bold">{formatKES(selectedConversation.car.price)}</p>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-warm-400 text-sm">No messages yet</p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                          msg.sender === 'me'
                            ? 'bg-charcoal-900 text-white rounded-br-md'
                            : 'bg-cream-100 text-charcoal-800 rounded-bl-md'
                        }`}
                      >
                        <p className="font-sans text-sm">{msg.text}</p>
                        <p className={`font-sans text-[10px] mt-1 ${
                          msg.sender === 'me' ? 'text-white/40' : 'text-warm-400'
                        }`}>
                          {msg.time} {msg.sender === 'me' && msg.read && '· Read'}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-cream-200">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-cream-100 rounded-lg text-warm-400">
                  <Paperclip size={20} />
                </button>
                <button className="p-2 hover:bg-cream-100 rounded-lg text-warm-400">
                  <Image size={20} />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-cream-50 border border-cream-200 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-400 outline-none focus:border-gold-500"
                />
                <button
                  onClick={sendMessage}
                  className="w-10 h-10 bg-gold-500 hover:bg-gold-600 text-white rounded-xl flex items-center justify-center transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={24} className="text-warm-300" />
              </div>
              <h2 className="font-serif text-xl text-charcoal-900 font-bold mb-2">Select a conversation</h2>
              <p className="font-sans text-sm text-warm-500">Choose a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
