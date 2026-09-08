import { useState, useEffect, type FC, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareText, X, Send, ShieldCheck, DollarSign, Car, ExternalLink } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { chatAPI } from '../../api/api';

export const ChatDrawer: FC = () => {
  const { isChatOpen, closeChat, activeChatVehicleId, vehicles, navigateTo, initiateEscrow } = useMarketplace();
  const { user } = useAuth();

  const [messageText, setMessageText] = useState('');
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const targetVehicle = vehicles.find(v => v.id === activeChatVehicleId) || vehicles[0];

  useEffect(() => {
    if (!isChatOpen || !user || !targetVehicle?.sellerId || targetVehicle.sellerId === user.id) return;
    let cancelled = false;
    setChatLoading(true); setChatError(null);
    chatAPI.start({ recipientId: targetVehicle.sellerId, carId: targetVehicle.id }).then(async (result: any) => {
      const id = result?.chat?.id || result?.chat?._id;
      if (!id || cancelled) return;
      setChatId(id);
      const data = await chatAPI.messages(id, { limit: 100 });
      if (!cancelled) setChatHistory(data.messages || data.data || []);
    }).catch((error: any) => {
      if (!cancelled) setChatError(error?.response?.data?.message || error?.message || 'Unable to load conversation.');
    }).finally(() => { if (!cancelled) setChatLoading(false); });
    return () => { cancelled = true; };
  }, [isChatOpen, user?.id, targetVehicle?.id, targetVehicle?.sellerId]);

  useEffect(() => {
    if (!isChatOpen || !chatId) return;
    const timer = window.setInterval(async () => {
      try { const data = await chatAPI.messages(chatId, { limit: 100 }); setChatHistory(data.messages || data.data || []); } catch { /* retain last good snapshot */ }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isChatOpen, chatId]);

  if (!isChatOpen) return null;


  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !chatId) return;
    const text = messageText.trim(); setMessageText('');
    try {
      const result = await chatAPI.send(chatId, { content: text });
      const sent = result?.message?.id ? result.message : result;
      setChatHistory(prev => [...prev, sent]);
    } catch (error: any) {
      setMessageText(text); setChatError(error?.message || 'Failed to send message.');
    }
  };

  const handleMakeOffer = () => {
    setOfferModalOpen(false);
    setOfferAmount('');
    setChatError('Direct offers are not part of the current chat API contract. Use the supported bidding or purchase flow instead.');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeChat}
          className="fixed inset-0 bg-[#0B1628]/70 backdrop-blur-xs"
        />

        {/* Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white border-l border-[#E2D8C7] shadow-2xl flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#00C9CE]/30 bg-[#1E3063] flex items-center justify-between text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#1E3063] border border-[#00C9CE]/40 flex items-center justify-center text-[#00C9CE] shrink-0 font-bold shadow-md">
                <MessageSquareText className="w-5 h-5 text-[#00C9CE]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-[#00C9CE] font-mono font-black uppercase tracking-wider">
                  KAYAD Concierge Chat
                </p>
                <h4 className="text-sm font-bold text-white font-serif truncate">
                  {targetVehicle?.sellerName || 'Verified Seller'}
                </h4>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="p-2 text-slate-300 hover:text-[#00C9CE] rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Vehicle Context Snippet */}
          {targetVehicle && (
            <div className="p-3 bg-[#1E3063]/95 border-b border-[#00C9CE]/30 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={targetVehicle.images[0]}
                  alt={targetVehicle.title}
                  loading="lazy"
                  decoding="async"
                  className="w-12 h-10 rounded-lg object-cover border border-[#00C9CE]/30"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#FCF9F4] truncate">
                    {targetVehicle.title}
                  </p>
                  <p className="text-xs text-[#00C9CE] font-mono font-black">
                    KES {((targetVehicle.buyNowPrice || targetVehicle.price) * ((targetVehicle.buyNowPrice || targetVehicle.price) < 1000000 ? 100 : 1)).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  navigateTo('vehicle_detail', targetVehicle.id);
                  closeChat();
                }}
                className="p-2 text-slate-300 hover:text-[#00C9CE] transition-colors cursor-pointer"
                title="View vehicle details"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FCF9F4]">
            {chatLoading && <div className="text-center text-xs text-slate-400 py-4">Loading conversation…</div>}
            {chatError && <div className="text-center text-xs text-rose-500 py-3">{chatError}</div>}
            {chatHistory.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${(msg.sender === 'user' || msg.sender === user?.id || msg.sender?.id === user?.id) ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#1E3063] text-[#FCF9F4] font-medium rounded-tr-none border border-[#00C9CE]/30 shadow-xs'
                      : 'bg-white text-[#1E3063] font-medium rounded-tl-none border border-[#E2D8C7] shadow-xs'
                  }`}
                >
                  {msg.message || msg.text || msg.content}
                </div>
                <span className="text-[10px] text-[#6B7A99] font-mono font-semibold mt-1 px-1">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
            ))}
          </div>

          {/* Quick Action Bar */}
          <div className="px-4 py-2.5 bg-[#1E3063] border-t border-[#00C9CE]/30 flex items-center justify-between gap-2">
            <button
              onClick={() => setOfferModalOpen(true)}
              className="flex-1 py-2 px-3 text-xs font-mono font-black uppercase tracking-wider bg-[#1E3063] text-[#00C9CE] hover:bg-[#0B1628] rounded-xl border border-[#00C9CE]/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <DollarSign className="w-3.5 h-3.5 text-[#00C9CE]" />
              Direct Offer
            </button>
            <button
              onClick={() => {
                if (targetVehicle && user) {
                  initiateEscrow(targetVehicle, user.id, user.name);
                  navigateTo('escrow');
                  closeChat();
                }
              }}
              className="flex-1 py-2 px-3 text-xs font-mono font-black uppercase tracking-wider bg-[#00C9CE] text-[#1E3063] hover:bg-[#00b5b9] rounded-xl border border-[#00C9CE] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E3063]" />
              Start Escrow
            </button>
          </div>

          {/* Send Input */}
          <form onSubmit={handleSend} className="p-3 bg-[#1E3063] border-t border-[#00C9CE]/30 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about inspection, title, or shipping..."
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-[#FCF9F4] border-2 border-[#1E3063] focus:border-[#00C9CE] rounded-xl text-xs text-[#1E3063] font-mono font-bold placeholder-[#6B7A99] focus:outline-none"
            />
            <button
              type="submit"
              className="p-2.5 bg-[#00C9CE] hover:bg-[#00b5b9] text-[#1E3063] font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4 text-[#1E3063]" />
            </button>
          </form>
        </motion.div>

        {/* Offer Modal */}
        {offerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-[#0B1628] border border-[#E2D8C7] dark:border-[#1A2A4E] rounded-3xl p-6 max-w-sm w-full space-y-4">
              <h4 className="text-base font-bold text-[#1E3063] dark:text-white">
                Submit Offer on {targetVehicle?.title}
              </h4>
              <p className="text-xs text-[#6B7A99]">
                Offers accepted by the dealer will immediately transition into a secure KAYAD Escrow agreement.
              </p>
              <Input
                label="Offer Amount (USD)"
                type="number"
                placeholder={`e.g. ${targetVehicle?.price}`}
                value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setOfferModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleMakeOffer}>
                  Submit Offer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
