import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTeamChatStore } from '../../store/teamChatStore';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../providers/SocketProvider';
import {
  MessageSquare, X, Send, Users, Tag,
  CheckCheck, Minimize2, Maximize2, Reply, Smile, Clock
} from 'lucide-react';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '💊', '💉'];

const PRESETS = [
  { icon: '💊', text: 'Can you verify this medicine dosage / availability?' },
  { icon: '💳', text: 'Patient at counter asking for bill / fee clarification.' },
  { icon: '↩️', text: 'Prescription price updated & re-dispensed to Billing.' },
  { icon: '🧪', text: 'Urgent diagnostic investigation sample dispatched.' },
  { icon: 'ℹ️', text: 'Is the consultant doctor available right now?' },
];

const ROLE_BADGE_STYLES = {
  DOCTOR:        { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Doctor' },
  NURSE:         { bg: 'bg-rose-100',    text: 'text-rose-700',    label: 'Nursing' },
  NURSE_INCHARGE:{ bg: 'bg-rose-100',    text: 'text-rose-700',    label: 'Nursing' },
  PHARMACIST:    { bg: 'bg-purple-100',  text: 'text-purple-700',  label: 'Pharmacy' },
  PHARMACY_STAFF:{ bg: 'bg-purple-100',  text: 'text-purple-700',  label: 'Pharmacy' },
  CASHIER:       { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Billing' },
  BILLING_STAFF: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Billing' },
  LAB_TECH:      { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Lab' },
  LABORATORY_STAFF: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Lab' },
  RADIOLOGIST:   { bg: 'bg-cyan-100',    text: 'text-cyan-700',    label: 'Radiology' },
  RADIOLOGY_STAFF: { bg: 'bg-cyan-100',  text: 'text-cyan-700',   label: 'Radiology' },
  RECEPTIONIST:  { bg: 'bg-indigo-100',  text: 'text-indigo-700',  label: 'Reception' },
  OPD_STAFF:     { bg: 'bg-indigo-100',  text: 'text-indigo-700',  label: 'Reception' },
  HOSPITAL_ADMIN:{ bg: 'bg-slate-800',   text: 'text-white',       label: 'Admin' },
};

const getRoleBadge = (role) => {
  const s = ROLE_BADGE_STYLES[role];
  if (!s) return null;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

export const TeamChatWidget = () => {
  const location = useLocation();
  const { user, isAuthenticated, token } = useAuthStore();
  const { socket } = useSocket();
  const {
    isOpen,
    toggleOpen,
    setIsOpen,
    contacts,
    messages,
    onlineCount,
    unreadTotal,
    isLoadingMessages,
    isSending,
    typingUser,
    replyingTo,
    setReplyingTo,
    clearReplyingTo,
    fetchRoster,
    selectChannel,
    sendMessage,
    toggleReaction,
    emitTyping,
    initSocketListeners,
  } = useTeamChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const [showPatientTagger, setShowPatientTagger] = useState(false);
  const [patientTagInput, setPatientTagInput] = useState('');
  const [attachedPatient, setAttachedPatient] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState(null);
  const messagesEndRef = useRef(null);

  const currentUserId = String(user?.id || user?._id || '');

  // Initialize socket listeners and load GENERAL channel on mount
  useEffect(() => {
    if (!socket || !isAuthenticated) return;
    const cleanup = initSocketListeners(socket);
    fetchRoster();
    return () => cleanup?.();
  }, [socket, isAuthenticated, initSocketListeners, fetchRoster]);

  // Auto-select GENERAL channel when widget opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      selectChannel('GENERAL');
    }
  }, [isOpen, isAuthenticated, selectChannel]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, replyingTo]);

  // STRICT CHECK: Do NOT render for SUPER_ADMIN, PATIENT, GUARDIAN, unauthenticated users, or on public auth routes
  if (!isAuthenticated || !token || !user) return null;
  if (['SUPER_ADMIN', 'PATIENT', 'GUARDIAN'].includes(user?.role)) return null;
  if (!user?.hospitalId) return null;
  if (
    location.pathname === '/login' ||
    location.pathname.startsWith('/login') ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname.startsWith('/super-admin')
  ) {
    return null;
  }

  const onlineStaff = contacts.filter((c) => c.isOnline);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;
    const text = inputMessage;
    const patRef = attachedPatient;
    setInputMessage('');
    setAttachedPatient(null);
    setShowPatientTagger(false);
    try {
      await sendMessage(text, patRef, replyingTo);
      clearReplyingTo();
    } catch (err) {
      alert('Failed to send: ' + (err.response?.data?.error?.message || err.message || 'Server error'));
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    emitTyping(socket, true);
  };

  const handleAttachPatient = () => {
    if (!patientTagInput.trim()) return;
    setAttachedPatient({ uhid: patientTagInput.trim(), patientName: patientTagInput.trim() });
    setPatientTagInput('');
    setShowPatientTagger(false);
  };

  const handleToggleReaction = async (messageId, emoji) => {
    setActiveReactionPickerMsgId(null);
    await toggleReaction(messageId, emoji, user);
  };

  // Group reactions helper
  const getGroupedReactions = (reactions = []) => {
    if (!Array.isArray(reactions) || reactions.length === 0) return [];
    const map = {};
    reactions.forEach((r) => {
      if (!map[r.emoji]) {
        map[r.emoji] = { emoji: r.emoji, count: 0, reactedByMe: false, userNames: [] };
      }
      map[r.emoji].count += 1;
      map[r.emoji].userNames.push(r.userName || 'Staff');
      if (String(r.userId) === currentUserId) {
        map[r.emoji].reactedByMe = true;
      }
    });
    return Object.values(map);
  };

  return (
    <>
      {/* ── Floating Trigger Button (Bottom-Right) ───────────────────── */}
      {!isOpen && (
        <button
          type="button"
          onClick={toggleOpen}
          className="fixed bottom-4 right-4 z-40 px-3 py-1.5 rounded-full bg-[#008069] hover:bg-[#00705c] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 flex items-center gap-2 group cursor-pointer border border-emerald-400/40"
          title="Open Hospital Staff Chat"
        >
          <div className="relative">
            <MessageSquare size={15} className="text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-300 border border-[#008069]" />
          </div>
          <span className="text-[11px] font-bold tracking-tight text-white hidden sm:inline">
            Staff Chat
          </span>
          <span className="text-[10px] text-emerald-100 font-semibold hidden md:inline">
            ({onlineCount})
          </span>
          {unreadTotal > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs animate-bounce">
              {unreadTotal}
            </span>
          )}
        </button>
      )}

      {/* ── WhatsApp-Style Chat Panel ─────────────────────────────────── */}
      {isOpen && isExpanded && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[90] animate-fade-in cursor-pointer"
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
          title="Click to minimize full view"
        />
      )}

      {isOpen && (
        <div
          className={`fixed transition-all duration-200 shadow-2xl flex flex-col bg-[#efeae2] border border-slate-300 overflow-hidden font-sans ${
            isExpanded
              ? 'z-[100] inset-3 sm:inset-6 md:inset-8 lg:inset-10 max-w-6xl mx-auto rounded-2xl max-h-[calc(100vh-2rem)]'
              : 'z-[70] bottom-3 right-3 sm:bottom-4 sm:right-4 w-[92vw] sm:w-[380px] h-[480px] max-h-[calc(100vh-3rem)] rounded-xl'
          }`}
        >
          {/* Header — WhatsApp Teal Bar (Always visible at top) */}
          <div className="bg-[#008069] text-white px-3 py-2 flex items-center justify-between border-b border-[#00705c] shrink-0 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-inner">
                <Users size={14} />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-xs text-white leading-tight truncate">Hospital Staff Group</h3>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-emerald-100 font-medium flex-wrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                  <span className="font-bold">{onlineCount} online</span>
                  <span className="text-emerald-200/70">&bull;</span>
                  <span className="truncate">{contacts.length} staff</span>
                  <span className="text-emerald-200/70">&bull;</span>
                  <span
                    className="inline-flex items-center gap-0.5 bg-black/20 text-emerald-100 px-1 py-0.2 rounded text-[9px] font-semibold border border-white/10"
                    title="Messages disappear after 7 days"
                  >
                    <Clock size={9} className="text-emerald-200" />
                    <span>7d</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Online Staff toggle */}
              <button
                type="button"
                onClick={() => setShowOnlinePanel((p) => !p)}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  showOnlinePanel ? 'bg-white/25 text-white' : 'text-emerald-100 hover:text-white hover:bg-white/15'
                }`}
                title={`View online staff (${onlineStaff.length})`}
              >
                <Users size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded-md text-emerald-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              {/* Prominent Cancel / Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md bg-black/20 text-white hover:bg-rose-600 transition-colors cursor-pointer border border-white/20 shadow-xs"
                title="Close Chat"
              >
                <X size={15} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Body Area */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Online Staff Sidebar — shown when toggled */}
            {showOnlinePanel && (
              <div className="w-52 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden shadow-lg z-20 animate-fade-in">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Online Staff ({onlineStaff.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowOnlinePanel(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {onlineStaff.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500 text-center">No other staff online</p>
                  ) : (
                    onlineStaff.map((s) => (
                      <div key={s._id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50">
                        <div className="relative shrink-0">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-800 font-bold text-xs">
                            {s.name?.charAt(0)}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {s.name} {s.isSelf && '(You)'}
                          </p>
                          {getRoleBadge(s.role)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Main WhatsApp Chat Feed */}
            <div className="flex-1 flex flex-col bg-[#efeae2] overflow-hidden">
              {/* Messages Container */}
              <div
                className="flex-1 overflow-y-auto p-3 space-y-2.5"
                style={{
                  backgroundImage: 'radial-gradient(#d1d7db 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Disappearing Messages & Privacy Notice Banner */}
                <div className="text-center my-1.5 space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50/95 border border-amber-200 text-[10.5px] font-bold text-amber-900 shadow-2xs">
                    <Clock size={12} className="text-amber-700 shrink-0" />
                    <span>⏱️ Disappearing messages are ON &bull; Messages disappear after 7 days</span>
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md bg-white/85 border border-slate-200 text-[9.5px] font-semibold text-slate-500 shadow-2xs">
                      🔒 Hospital staff internal bridge &bull; Visible only to hospital members
                    </span>
                  </div>
                </div>

                {isLoadingMessages ? (
                  <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                      <MessageSquare size={22} />
                    </div>
                    <p className="font-extrabold text-slate-900 text-sm">No messages yet</p>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto">
                      Say hello or send a clinical/billing update to the team!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const msgSenderId = String(msg.senderId?._id || msg.senderId?.id || msg.senderId || '');
                    const isMe = Boolean(currentUserId && msgSenderId && currentUserId === msgSenderId);
                    const groupedReactions = getGroupedReactions(msg.reactions);
                    const senderDisplayName = isMe
                      ? `You (${msg.senderName || user?.name || 'Staff'})`
                      : (msg.senderName || 'Staff Member');
                    const senderDisplayRole = msg.senderRole || (isMe ? user?.role : 'STAFF');

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col group relative ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender info & role badge for all messages */}
                        <div
                          className={`flex items-center gap-1.5 text-[11px] font-extrabold mb-1 ${
                            isMe ? 'text-emerald-800 justify-end mr-1' : 'text-[#008069] ml-1'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 shadow-2xs ${
                              isMe
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#008069] text-white'
                            }`}
                          >
                            {(msg.senderName || user?.name || 'S').charAt(0)}
                          </div>
                          <span>{senderDisplayName}</span>
                          {getRoleBadge(senderDisplayRole)}
                        </div>

                        {/* Message Bubble + Action Buttons Container */}
                        <div className="relative max-w-[85%] sm:max-w-[78%]">
                          {/* Hover Action Bar (Reply + Emoji) */}
                          <div
                            className={`absolute -top-7 z-20 hidden group-hover:flex items-center gap-0.5 bg-white border border-slate-200 rounded-full px-1.5 py-0.5 shadow-md ${
                              isMe ? 'right-1' : 'left-1'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setReplyingTo(msg)}
                              className="p-1 rounded-full text-slate-500 hover:text-[#008069] hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Reply to message"
                            >
                              <Reply size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveReactionPickerMsgId(
                                  activeReactionPickerMsgId === msg._id ? null : msg._id
                                )
                              }
                              className="p-1 rounded-full text-slate-500 hover:text-amber-500 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Add reaction"
                            >
                              <Smile size={13} />
                            </button>
                          </div>

                          {/* Quick Emoji Reaction Picker Popover */}
                          {activeReactionPickerMsgId === msg._id && (
                            <div
                              className={`absolute -top-12 z-30 flex items-center gap-1 bg-white border border-slate-300 rounded-full px-2 py-1 shadow-xl animate-fade-in ${
                                isMe ? 'right-0' : 'left-0'
                              }`}
                            >
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg._id, emoji)}
                                  className="text-base hover:scale-125 active:scale-95 transition-transform p-0.5 cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setActiveReactionPickerMsgId(null)}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}

                          {/* WhatsApp Bubble */}
                          <div
                            className={`p-2.5 rounded-2xl shadow-xs text-xs space-y-1 relative select-text ${
                              isMe
                                ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-xs border border-[#c3f4bc]'
                                : 'bg-white text-[#111b21] rounded-tl-xs border border-slate-200/80'
                            }`}
                          >
                            {/* Quoted Reply Reference Box inside Message */}
                            {msg.replyTo && msg.replyTo.message && (
                              <div
                                className={`p-2 rounded-lg text-[11px] mb-1.5 border-l-4 ${
                                  isMe
                                    ? 'bg-[#c7f3bf]/80 border-[#008069] text-slate-800'
                                    : 'bg-slate-100 border-[#008069] text-slate-800'
                                }`}
                              >
                                <p className="font-extrabold text-[#008069] text-[10px] leading-tight">
                                  {msg.replyTo.senderName || 'Staff'} {msg.replyTo.senderRole && `(${msg.replyTo.senderRole})`}
                                </p>
                                <p className="line-clamp-2 text-slate-700 mt-0.5 font-medium">
                                  {msg.replyTo.message}
                                </p>
                              </div>
                            )}

                            {/* Attached Patient Tag Reference */}
                            {msg.patientRef?.uhid && (
                              <div
                                className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${
                                  isMe
                                    ? 'bg-[#bceeb2] text-[#0f5132] border border-[#a2df96]'
                                    : 'bg-slate-100 text-slate-900 border border-slate-200'
                                }`}
                              >
                                <Tag size={11} className={isMe ? 'text-emerald-700' : 'text-indigo-600'} />
                                <span>Patient: {msg.patientRef.patientName || msg.patientRef.uhid}</span>
                              </div>
                            )}

                            {/* Message Text */}
                            <p className="whitespace-pre-wrap leading-relaxed font-normal text-[#111b21]">
                              {msg.message}
                            </p>

                            {/* Timestamp & Checks */}
                            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-0.5 font-medium select-none">
                              <span
                                className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 opacity-80"
                                title="Disappearing message &bull; Disappears 7 days after sending"
                              >
                                <Clock size={9} />
                              </span>
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isMe && <CheckCheck size={13} className="text-[#53bdeb]" />}
                            </div>
                          </div>

                          {/* Reaction Pills underneath bubble */}
                          {groupedReactions.length > 0 && (
                            <div
                              className={`flex flex-wrap gap-1 mt-0.5 ${
                                isMe ? 'justify-end mr-1' : 'justify-start ml-1'
                              }`}
                            >
                              {groupedReactions.map((r) => (
                                <button
                                  key={r.emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg._id, r.emoji)}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer shadow-2xs ${
                                    r.reactedByMe
                                      ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-extrabold ring-1 ring-emerald-400'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                  title={`Reacted by: ${r.userNames.join(', ')}`}
                                >
                                  <span>{r.emoji}</span>
                                  {r.count > 1 && <span className="text-[10px]">{r.count}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator */}
                {typingUser && (
                  <div className="text-xs font-bold text-[#008069] italic animate-pulse ml-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#008069] inline-block animate-ping" />
                    <span>{typingUser} is typing…</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Presets Carousel */}
              <div className="p-1.5 bg-[#f0f2f5] border-t border-slate-200 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 shrink-0 pl-1">
                  Quick:
                </span>
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputMessage(p.text)}
                    className="px-2 py-0.5 rounded-lg text-xs font-medium bg-white text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 shrink-0 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span>{p.icon}</span>
                    <span className="truncate max-w-[150px]">{p.text}</span>
                  </button>
                ))}
              </div>

              {/* Replying Preview Bar (WhatsApp Style) */}
              {replyingTo && (
                <div className="p-2 bg-[#f0f2f5] border-t-2 border-[#008069] flex items-center justify-between gap-2 shrink-0 animate-fade-in">
                  <div className="flex items-center gap-2 min-w-0 border-l-4 border-[#008069] pl-2">
                    <Reply size={14} className="text-[#008069] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-extrabold text-[#008069] text-xs leading-tight truncate">
                        Replying to {replyingTo.senderName} {replyingTo.senderRole && `(${replyingTo.senderRole})`}
                      </p>
                      <p className="text-[11px] text-slate-600 truncate font-medium mt-0.5">
                        {replyingTo.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearReplyingTo}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                    title="Cancel reply"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Patient Tag Bar */}
              {showPatientTagger && (
                <div className="p-2 bg-emerald-50 border-t border-emerald-100 flex items-center gap-2 shrink-0">
                  <Tag size={14} className="text-emerald-700 shrink-0" />
                  <input
                    type="text"
                    value={patientTagInput}
                    onChange={(e) => setPatientTagInput(e.target.value)}
                    placeholder="Enter Patient UHID or Name…"
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAttachPatient}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#008069] text-white hover:bg-[#00705c] cursor-pointer"
                  >
                    Attach
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPatientTagger(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {attachedPatient && (
                <div className="px-3 py-1 bg-emerald-100 border-t border-emerald-200 flex items-center justify-between text-xs text-emerald-950 font-bold shrink-0">
                  <span className="flex items-center gap-1.5">
                    <Tag size={12} className="text-emerald-700" /> Patient: {attachedPatient.patientName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachedPatient(null)}
                    className="text-emerald-800 hover:text-emerald-950 font-extrabold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Message Input Bar (WhatsApp Layout) */}
              <form
                onSubmit={handleSend}
                className="p-1.5 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-1.5 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setShowPatientTagger(!showPatientTagger)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                    showPatientTagger || attachedPatient
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Attach Patient Reference"
                >
                  <Tag size={14} />
                </button>

                <input
                  type="text"
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
                  placeholder="Type a message… (Enter to send)"
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008069] focus:ring-1 focus:ring-[#008069] font-medium"
                />

                <button
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  className="p-2 rounded-full bg-[#008069] text-white hover:bg-[#00705c] disabled:opacity-40 transition-all cursor-pointer active:scale-95 shrink-0 shadow-xs"
                  title="Send Message"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
