import React, { useEffect, useState } from 'react';
import { Plus, MessageSquare, Trash2, X, Sparkles, Loader2, ChevronLeft } from 'lucide-react';
import type { Conversation } from '../hooks/useConversations';
import type { User } from '@supabase/supabase-js';

interface ConversationSidebarProps {
  conversations: Conversation[];
  loading: boolean;
  activeId: string | null;
  user: User | null;
  lang?: 'en' | 'si' | 'ta';
  onSelect: (id: string) => void;
  onNew: () => Promise<Conversation | null>;
  onDelete: (id: string) => Promise<boolean>;
  onClearAll: () => Promise<boolean>;
  onRefresh: () => void;
}

const COPY = {
  newChat:  { en: 'New chat',     si: 'නව කතාබහ',   ta: 'புதிய அரட்டை' },
  empty:    { en: 'No conversations yet.\nAsk Wasi for anything!',
              si: 'තවම කතාබහක් නැත.\nවාසිගෙන් ඕනෑ දෙයක් අහන්න!',
              ta: 'இன்னும் உரையாடல்கள் இல்லை.\nவாசியிடம் எதையும் கேளுங்கள்!' },
  deleting: { en: 'Delete',        si: 'මකන්න',       ta: 'நீக்கு' },
  cancel:   { en: 'Cancel',        si: 'අවලංගු කරන්න', ta: 'ரத்து' },
  confirm:  { en: 'Delete this conversation?',
              si: 'මෙම කතාබහ මකන්නද?',
              ta: 'இந்த உரையாடலை நீக்கவா?' },
  clearAll:        { en: 'Clear all',                  si: 'සියල්ල මකන්න',         ta: 'அனைத்தையும் அழி' },
  clearAllTitle:   { en: 'Delete ALL conversations?', si: 'සියලු කතාබහ මකන්නද?', ta: 'அனைத்து உரையாடல்களையும் நீக்கவா?' },
  clearAllBody:    { en: 'This will permanently delete all your conversations, messages, and cart items. Your account will remain. This cannot be undone.',
                     si: 'මෙය ඔබේ සියලු කතාබහ, පණිවිඩ සහ කරත්ත අයිතම සදාමකින් මකනු ඇත. ඔබේ ගිණුම පවතිනු ඇත. මෙය ආපසු හැරවිය නොහැක.',
                     ta: 'இது உங்கள் அனைத்து உரையாடல்கள், செய்திகள் மற்றும் கார்ட்டை நிரந்தரமாக நீக்கும். உங்கள் கணக்கு இருக்கும். இதை மீட்டமுடியாது.' },
  confirmClear:    { en: 'Yes, delete all',            si: 'ඔව්, සියල්ල මකන්න',    ta: 'ஆம், அனைத்தையும் நீக்கு' },
  clearing:        { en: 'Deleting...',                si: 'මකමින්...',             ta: 'நீக்குகிறது...' },
};

const t = (key: keyof typeof COPY, lang: 'en' | 'si' | 'ta' = 'en'): string =>
  COPY[key][lang] ?? COPY[key].en;

const formatRelativeTime = (iso: string): string => {
  const dt = new Date(iso);
  const now = Date.now();
  const diff = (now - dt.getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d`;
  return dt.toLocaleDateString();
};

export default function ConversationSidebar({
  conversations, loading, activeId, user, lang = 'en',
  onSelect, onNew, onDelete, onClearAll, onRefresh,
}: ConversationSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  // Start collapsed on mobile — a 288px fixed sidebar eats the whole phone screen.
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );

  // Refresh on mount so server-generated titles are visible immediately
  useEffect(() => {
    onRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNew = async () => {
    setCreating(true);
    try {
      const conv = await onNew();
      if (conv) onSelect(conv.id);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDelete(id);
  };

  const confirmDeleteAction = async (id: string) => {
    setDeleting(id);
    const ok = await onDelete(id);
    setDeleting(null);
    if (ok) setConfirmDelete(null);
  };

  const confirmClearAllAction = async () => {
    setClearing(true);
    const ok = await onClearAll();
    setClearing(false);
    if (ok) setConfirmClearAll(false);
  };

  return (
    <>
      {/* Sidebar — persistent column on the left, just like header/footer.
          On mobile, it collapses to a slide-in drawer. */}
      <aside
        className={`${collapsed ? 'w-12' : 'w-72'} flex-shrink-0 flex flex-col
                   glass-panel border-r-0
                   self-stretch transition-all duration-300 ease-out`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#C9A84C]/15 flex-shrink-0">
          <div className={`flex items-center gap-2 ${collapsed ? 'hidden' : ''}`}>
            <Sparkles className="w-4 h-4 text-[#C9A84C]" />
            <span className="text-xs font-mono font-bold tracking-[0.18em] uppercase text-[#5B3E8A]">
              {user ? 'Your chats' : 'Wasi'}
            </span>
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-[#5B3E8A]/50 hover:text-[#5B3E8A] p-1.5 rounded-full hover:bg-[#402970]/8 transition cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {!collapsed && (
        <>
        {/* New chat button */}
        <div className="px-3 py-3 flex-shrink-0">
          <button
            onClick={handleNew}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-violet to-violet-deep hover:from-violet-deep hover:to-violet-deep text-white text-sm font-semibold py-2.5 min-h-[44px] rounded-xl cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>{t('newChat', lang)}</span>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-gray-400 whitespace-pre-line leading-relaxed">
              {t('empty', lang)}
            </div>
          ) : (
            <ul className="space-y-1">
              {conversations.map((c) => {
                const isActive = c.id === activeId;
                const isDeleting = deleting === c.id;
                return (
                  <li key={c.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => { if (c.id !== activeId) onSelect(c.id); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && c.id !== activeId) onSelect(c.id); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl group transition-all cursor-pointer flex items-start gap-2 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#EBF4F0] to-[#F2F8F5] text-[#5B3E8A] shadow-sm border border-[#402970]/10'
                          : 'hover:bg-white/70 text-gray-700 border border-transparent'
                      } ${isDeleting ? 'opacity-50' : ''}`}
                    >
                      <MessageSquare className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? 'text-[#402970]' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                          {c.title || 'New conversation'}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {formatRelativeTime(c.last_message_at)}
                          {c.occasion && <> · {c.occasion}</>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(e, c.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1 rounded transition flex-shrink-0"
                        aria-label="Delete conversation"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        </>
        )}

        {/* Footer — count + clear button — shown when expanded */}
        {!collapsed && (
        <div className="px-3 py-2 border-t border-black/5 flex-shrink-0 space-y-2">
          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
            {user ? ' · saved to your account' : ' · session-only'}
          </p>
          {conversations.length > 0 && (
            <button
              onClick={() => setConfirmClearAll(true)}
              className="w-full text-[10px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 py-1.5 rounded-lg cursor-pointer transition text-center"
            >
              {t('clearAll', lang)}
            </button>
          )}
        </div>
        )}
      </aside>

      {/* Clear-all confirmation modal — was missing entirely; the button silently no-oped */}
      {confirmClearAll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => !clearing && setConfirmClearAll(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <Trash2 className="w-4 h-4" />
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
                {t('clearAllTitle', lang)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              {t('clearAllBody', lang)}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClearAll(false)}
                disabled={clearing}
                className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {t('cancel', lang)}
              </button>
              <button
                onClick={confirmClearAllAction}
                disabled={clearing}
                className="px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {clearing ? t('clearing', lang) : t('confirmClear', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <Trash2 className="w-4 h-4" />
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
                Confirm delete
              </span>
            </div>
            <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">
              {t('confirm', lang)}
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              This will also delete all messages and the cart in this conversation.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                {t('cancel', lang)}
              </button>
              <button
                onClick={() => confirmDeleteAction(confirmDelete)}
                disabled={deleting === confirmDelete}
                className="px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting === confirmDelete ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {t('deleting', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
