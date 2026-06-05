import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Product, City, Order } from '../types';
import { Send, MapPin, CheckCircle2, Ticket, Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';

interface ChatSectionProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  lang: 'en' | 'si' | 'ta';
  onAddToBundle: (p: Product, variant?: any) => void;
  onQuickReply: (text: string) => void;
  cartSize?: number;
}

const QUICK_PICKS = {
  en: ['Show chocolates 🍫', 'Birthday flowers 💐', 'Gift hampers 🎁', 'Track order 🗺️'],
  si: ['චොකලට් 🍫', 'මල් 💐', 'තෑගි කූඩ 🎁', 'ලුහුබඳින්න 🗺️'],
  ta: ['சாக்லேட் 🍫', 'மலர்கள் 💐', 'பரிசு 🎁', 'கண்காணிக்க 🗺️'],
};

const PLACEHOLDER = {
  en: 'Ask Wasi for cakes, roses, hampers, tracking…',
  si: 'සිංහල හෝ English — වාසිගෙන් ඕනෑ දේ අහන්න…',
  ta: 'தமிழில் அல்லது English — வாசியிடம் கேளுங்கள்…',
};

export default function ChatSection({
  messages, isStreaming, onSendMessage, lang, onAddToBundle, onQuickReply, cartSize = 0
}: ChatSectionProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const fontClass = lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : 'font-sans';

  return (
    <div className="flex flex-col bg-breathing rounded-3xl overflow-hidden relative"
         style={{ height: '80vh', boxShadow: '0 4px 32px rgba(10,92,69,0.08)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white/80 backdrop-blur-md border-b border-black/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] flex items-center justify-center text-white font-display font-bold text-base shadow-md shadow-[#0F6E56]/20">
            W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-[#1A1A1A]">Wasi</span>
              <span className="font-display font-bold text-sm text-[#C0392B]">Concierge</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[9px] font-mono font-semibold text-gray-400 tracking-wider">
              KAPRUKA AI GIFT GUIDE
            </p>
          </div>
        </div>
        <span className="text-[9px] bg-[#E1F5EE] text-[#0A5C45] font-mono px-2.5 py-1 rounded-full font-bold border border-[#0F6E56]/10 tracking-wider">
          LIVE MCP
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
            <Sparkles className="w-10 h-10 text-[#0F6E56]" />
            <p className="text-sm text-gray-500 font-sans">Your gift journey starts here…</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col msg-in ${isUser ? 'items-end' : 'items-start'} space-y-2`}
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              {/* Bubble */}
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                isUser
                  ? 'bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] text-white rounded-br-none shadow-lg shadow-[#0F6E56]/20'
                  : 'glass-bubble text-[#1A1A1A] rounded-bl-none'
              }`}>
                {isUser ? (
                  <p className={fontClass}>{msg.content}</p>
                ) : (
                  <div className={`ai-prose ${fontClass}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img:        ({ src, alt }) => src ? <div className="my-2"><img src={src} alt={alt || ''} className="rounded-xl max-h-48 object-cover border border-black/5" referrerPolicy="no-referrer" /></div> : null,
                        p:          ({ children }) => <p>{children}</p>,
                        strong:     ({ children }) => <strong>{children}</strong>,
                        em:         ({ children }) => <em className="opacity-80">{children}</em>,
                        ul:         ({ children }) => <ul>{children}</ul>,
                        ol:         ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
                        li:         ({ children }) => <li><span className="text-[#0F6E56] flex-shrink-0 text-xs">•</span><span>{children}</span></li>,
                        h1:         ({ children }) => <p className="font-bold text-base text-[#0A5C45] mt-1">{children}</p>,
                        h2:         ({ children }) => <p className="font-bold text-sm text-[#0A5C45] mt-1">{children}</p>,
                        h3:         ({ children }) => <p className="font-semibold text-sm text-[#0A5C45]">{children}</p>,
                        code:       ({ children }) => <code>{children}</code>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-[#0F6E56]/30 pl-2 italic opacity-70 my-1">{children}</blockquote>,
                        table:      ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>,
                        thead:      ({ children }) => <thead>{children}</thead>,
                        tbody:      ({ children }) => <tbody>{children}</tbody>,
                        tr:         ({ children }) => <tr className="border-b border-black/5">{children}</tr>,
                        th:         ({ children }) => <th className="px-2 py-1.5 text-left font-bold text-[#0A5C45]">{children}</th>,
                        td:         ({ children }) => <td className="px-2 py-1.5">{children}</td>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-[9px] font-mono text-gray-400 px-1">{msg.timestamp}</span>

              {/* Product carousel — only show during initial discovery (cart empty) or when user explicitly asked */}
              {cartSize === 0 && msg.products && msg.products.length > 0 && !msg.content.includes('Added to bundle') && (
                <div className="w-full mt-1">
                  <div className="flex items-center gap-1.5 px-1 mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#0A5C45]">
                    <Sparkles className="w-3 h-3 text-[#C9A84C] fill-[#C9A84C]" />
                    CURATED FOR YOU
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-3 snap-x scrollbar-none">
                    {msg.products.map((prod) => (
                      <div key={prod.product_code} className="snap-center">
                        <ProductCard product={prod} onAddToBundle={onAddToBundle} lang={lang} />
                      </div>
                    ))}
                  </div>
                </div>
              )}



              {/* Order card */}
              {msg.order_created && (
                <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl animate-fade-in">
                  <div className="bg-gradient-to-br from-[#0A5C45] to-[#0F6E56] p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-mono bg-white/15 text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                        ORDER LOCKED
                      </span>
                      <span className="text-sm font-mono font-bold text-[#C9A84C]">
                        Rs. {msg.order_created.total_lkr.toLocaleString()}
                      </span>
                    </div>
                    {/* Fee breakdown — read from summary object where server puts it */}
                    <div className="space-y-1 px-1">
                      <div className="flex justify-between text-[10px] font-mono text-white/65">
                        <span>Items</span>
                        <span>Rs. {((msg.order_created.summary?.items_total ?? 0) - (msg.order_created.summary?.addons_total ?? 0)).toLocaleString()}</span>
                      </div>
                      {(msg.order_created.summary?.addons_total ?? 0) > 0 && (
                        <div className="flex justify-between text-[10px] font-mono text-white/50">
                          <span>Icing text</span>
                          <span>Rs. {(msg.order_created.summary?.addons_total ?? 0).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[10px] font-mono text-white/65">
                        <span>Delivery</span>
                        <span>Rs. {(msg.order_created.summary?.delivery_fee ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="bg-black/15 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-white/60 font-mono mb-0.5">Reference</p>
                      <p className="text-base font-mono font-bold text-white tracking-widest">{msg.order_created.order_ref}</p>
                    </div>
                    <p className="text-[9px] text-white/50 font-mono text-center">
                      Open the checkout link to pay. Kapruka will email your tracking number.
                    </p>
                    <button
                      onClick={() => window.open(msg.order_created!.pay_url, '_blank', 'noopener,noreferrer')}
                      className="w-full bg-white hover:bg-gray-50 text-[#0A5C45] font-display font-bold text-sm py-3 rounded-xl transition cursor-pointer shadow-md active:scale-98"
                    >
                      Open Kapruka Checkout →
                    </button>
                  </div>
                </div>
              )}

              {/* Tracking */}
              {msg.tracking_result && (
                <div className="w-full max-w-sm glass-bubble rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-black/5">
                    <span className="text-xs font-bold text-[#1A1A1A]">{msg.tracking_result.recipient?.name}</span>
                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-lg uppercase ${
                      msg.tracking_result.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                      msg.tracking_result.status === 'dispatched' ? 'bg-amber-50 text-amber-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {msg.tracking_result.status}
                    </span>
                  </div>
                  <div className="space-y-3 pl-3 border-l-2 border-[#0F6E56]/20">
                    {msg.tracking_result.timeline?.map((step: any, i: number) => (
                      <div key={i} className="space-y-0.5">
                        <p className="text-xs font-semibold text-[#1A1A1A]">{step.event}</p>
                        <p className="text-[10px] font-mono text-gray-400">{step.timestamp}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex items-start">
            <div className="glass-bubble rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-2 h-2 rounded-full bg-[#0F6E56]/50 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick replies */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none bg-white/60 backdrop-blur-sm border-t border-black/5 flex-shrink-0">
        {(QUICK_PICKS[lang] || QUICK_PICKS.en).map((text, i) => (
          <button
            key={i}
            onClick={() => onQuickReply(text)}
            className="px-3 py-1.5 bg-white hover:bg-[#E1F5EE] hover:text-[#0F6E56] hover:border-[#0F6E56]/30 border border-black/8 text-[#6B6B6B] rounded-full text-xs font-medium cursor-pointer transition-all flex-shrink-0 shadow-xs"
          >
            {text}
          </button>
        ))}
      </div>

      {/* Input composer */}
      <form onSubmit={handleSubmit} className="px-4 py-3.5 border-t border-black/5 bg-white/80 backdrop-blur-md flex gap-2.5 flex-shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={PLACEHOLDER[lang]}
          className={`flex-1 bg-[#F7F5F1] border border-black/8 focus:border-[#0F6E56]/40 focus:bg-white rounded-2xl px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 placeholder-gray-400 text-[#1A1A1A] ${fontClass}`}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] hover:from-[#0A5C45] hover:to-[#083D30] text-white p-3.5 rounded-2xl cursor-pointer transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#0F6E56]/25 btn-shimmer"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}
