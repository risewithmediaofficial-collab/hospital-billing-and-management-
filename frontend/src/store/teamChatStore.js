import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const isWithin7Days = (dateStr) => {
  if (!dateStr) return true;
  return new Date(dateStr).getTime() >= Date.now() - SEVEN_DAYS_MS;
};

export const useTeamChatStore = create((set, get) => ({
  isOpen: false,
  activeTab: 'contacts', // 'channels' | 'contacts'
  selectedChannel: 'GENERAL', // 'GENERAL' | 'PHARMACY_BILLING' | 'OPD_CLINICAL' | 'EMERGENCY'
  selectedContact: null, // User object or null
  replyingTo: null, // message object or null

  channels: [],
  contacts: [],
  messages: [],
  onlineCount: 0,
  totalStaffCount: 0,
  unreadTotal: 0,
  isLoadingRoster: false,
  isLoadingMessages: false,
  isSending: false,
  typingUser: null,

  setIsOpen: (isOpen) => {
    set({ isOpen });
    if (isOpen) {
      get().fetchRoster();
      // Always load the single shared GENERAL group chat
      get().fetchMessages('GENERAL', null);
      set({ selectedChannel: 'GENERAL', selectedContact: null });
    }
  },

  toggleOpen: () => {
    const next = !get().isOpen;
    get().setIsOpen(next);
  },

  setActiveTab: (activeTab) => set({ activeTab }),

  setReplyingTo: (msg) => set({ replyingTo: msg }),
  clearReplyingTo: () => set({ replyingTo: null }),

  selectChannel: (channelId) => {
    set({ selectedChannel: channelId, selectedContact: null, messages: [], replyingTo: null });
    get().fetchMessages(channelId, null);
  },

  selectContact: (contact) => {
    set({ selectedContact: contact, selectedChannel: null, messages: [], replyingTo: null });
    get().fetchMessages(null, contact._id);
  },

  fetchRoster: async () => {
    set({ isLoadingRoster: true });
    try {
      const res = await axiosClient.get('/chat/roster');
      const data = res.data || {};
      const channels = data.channels || [];
      const contacts = data.contacts || [];

      const unreadChannels = channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      const unreadContacts = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

      set({
        channels,
        contacts,
        onlineCount: data.onlineCount || 0,
        totalStaffCount: data.totalStaffCount || 0,
        unreadTotal: unreadChannels + unreadContacts,
      });
    } catch (err) {
      console.error('[TeamChatStore] Failed to fetch roster:', err);
    } finally {
      set({ isLoadingRoster: false });
    }
  },

  fetchMessages: async (channel, contactId) => {
    set({ isLoadingMessages: true });
    try {
      const params = {};
      if (contactId) params.contactId = contactId;
      else if (channel) params.channel = channel;
      else params.channel = 'GENERAL';

      const res = await axiosClient.get('/chat/messages', { params });
      const rawMessages = res.data || [];
      const messages = rawMessages.filter((m) => isWithin7Days(m.createdAt));
      set({ messages });

      // Mark unread as read locally
      if (contactId) {
        set((state) => ({
          contacts: state.contacts.map((c) =>
            String(c._id) === String(contactId) ? { ...c, unreadCount: 0 } : c
          ),
        }));
      } else if (channel) {
        set((state) => ({
          channels: state.channels.map((ch) =>
            ch.id === channel ? { ...ch, unreadCount: 0 } : ch
          ),
        }));
      }
      get().recomputeUnreadTotal();
    } catch (err) {
      console.error('[TeamChatStore] Failed to fetch messages:', err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (text, patientRef = null, customReplyTo = null) => {
    if (!text || !text.trim()) return;
    const { selectedContact, selectedChannel, replyingTo } = get();
    const effectiveReply = customReplyTo || replyingTo;

    set({ isSending: true });
    try {
      const payload = {
        message: text.trim(),
        channel: selectedContact ? 'DIRECT' : selectedChannel || 'GENERAL',
        recipientId: selectedContact ? selectedContact._id : null,
        patientRef,
        replyTo: effectiveReply
          ? {
              messageId: effectiveReply._id,
              senderName: effectiveReply.senderName,
              senderRole: effectiveReply.senderRole,
              message: effectiveReply.message,
              patientRef: effectiveReply.patientRef,
            }
          : undefined,
      };

      const res = await axiosClient.post('/chat/messages', payload);
      const newMsg = res.data;

      // Optimistically append message if not already present
      set((state) => {
        const exists = state.messages.some((m) => String(m._id) === String(newMsg._id));
        if (exists) return { replyingTo: null };
        return { messages: [...state.messages, newMsg], replyingTo: null };
      });

      return newMsg;
    } catch (err) {
      console.error('[TeamChatStore] Failed to send message:', err);
      throw err;
    } finally {
      set({ isSending: false });
    }
  },

  toggleReaction: async (messageId, emoji, currentUser) => {
    if (!messageId || !emoji) return;
    const userId = currentUser?.id || currentUser?._id;

    // Optimistic UI update
    set((state) => ({
      messages: state.messages.map((m) => {
        if (String(m._id) !== String(messageId)) return m;
        const currentReactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
        const existingIdx = currentReactions.findIndex(
          (r) => String(r.userId) === String(userId) && r.emoji === emoji
        );

        if (existingIdx > -1) {
          currentReactions.splice(existingIdx, 1);
        } else {
          const otherIdx = currentReactions.findIndex((r) => String(r.userId) === String(userId));
          if (otherIdx > -1) {
            currentReactions.splice(otherIdx, 1);
          }
          currentReactions.push({
            userId,
            userName: currentUser?.name || 'Staff',
            userRole: currentUser?.role || 'STAFF',
            emoji,
            createdAt: new Date(),
          });
        }
        return { ...m, reactions: currentReactions };
      }),
    }));

    try {
      const res = await axiosClient.post(`/chat/messages/${messageId}/react`, { emoji });
      if (res.data?.reactions) {
        set((state) => ({
          messages: state.messages.map((m) =>
            String(m._id) === String(messageId) ? { ...m, reactions: res.data.reactions } : m
          ),
        }));
      }
    } catch (err) {
      console.error('[TeamChatStore] Failed to toggle reaction:', err);
      // Refetch if error
      get().fetchMessages(get().selectedChannel || 'GENERAL', get().selectedContact?._id);
    }
  },

  emitTyping: (socket, isTyping = true) => {
    if (!socket) return;
    const { selectedContact, selectedChannel } = get();
    socket.emit('chat:typing', {
      recipientId: selectedContact ? selectedContact._id : null,
      channel: selectedContact ? 'DIRECT' : selectedChannel || 'GENERAL',
      isTyping,
    });
  },

  recomputeUnreadTotal: () => {
    const { channels, contacts } = get();
    const unreadChannels = channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    const unreadContacts = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    set({ unreadTotal: unreadChannels + unreadContacts });
  },

  initSocketListeners: (socket) => {
    if (!socket) return () => {};

    const handleNewMessage = (msg) => {
      const { selectedContact, selectedChannel, isOpen } = get();
      const currentUserId = socket.auth?.userId || '';

      // Check if message belongs to active open view
      const isDirectMatch =
        selectedContact &&
        (String(msg.senderId) === String(selectedContact._id) ||
          String(msg.recipientId) === String(selectedContact._id));

      const isChannelMatch =
        !selectedContact &&
        msg.channel &&
        msg.channel === selectedChannel;

      if (isOpen && (isDirectMatch || isChannelMatch)) {
        set((state) => {
          const exists = state.messages.some((m) => String(m._id) === String(msg._id));
          if (exists) return state;
          return { messages: [...state.messages, msg] };
        });
      } else {
        // Update unread count
        if (msg.channel === 'DIRECT' && String(msg.senderId) !== String(currentUserId)) {
          set((state) => ({
            contacts: state.contacts.map((c) =>
              String(c._id) === String(msg.senderId)
                ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: { text: msg.message, timestamp: msg.createdAt } }
                : c
            ),
          }));
        } else if (msg.channel && msg.channel !== 'DIRECT' && String(msg.senderId) !== String(currentUserId)) {
          set((state) => ({
            channels: state.channels.map((ch) =>
              ch.id === msg.channel
                ? { ...ch, unreadCount: (ch.unreadCount || 0) + 1, lastMessage: { text: msg.message, timestamp: msg.createdAt, senderName: msg.senderName } }
                : ch
            ),
          }));
        }
        get().recomputeUnreadTotal();
      }
    };

    const handleReactionUpdated = (data) => {
      if (!data?.messageId) return;
      set((state) => ({
        messages: state.messages.map((m) =>
          String(m._id) === String(data.messageId)
            ? { ...m, reactions: data.reactions || [] }
            : m
        ),
      }));
    };

    const handlePresence = ({ userId, isOnline }) => {
      set((state) => {
        const contacts = state.contacts.map((c) =>
          String(c._id) === String(userId) ? { ...c, isOnline } : c
        );
        const onlineCount = contacts.filter((c) => c.isOnline).length;
        return { contacts, onlineCount };
      });
    };

    const handleTyping = (data) => {
      const { selectedContact, selectedChannel } = get();
      if (
        (selectedContact && String(data.senderId) === String(selectedContact._id)) ||
        (!selectedContact && data.channel === selectedChannel)
      ) {
        set({ typingUser: data.isTyping ? data.senderName : null });
        if (data.isTyping) {
          setTimeout(() => set({ typingUser: null }), 3000);
        }
      }
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:reaction_updated', handleReactionUpdated);
    socket.on('staff:presence_changed', handlePresence);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:reaction_updated', handleReactionUpdated);
      socket.off('staff:presence_changed', handlePresence);
      socket.off('chat:typing', handleTyping);
    };
  },
}));
