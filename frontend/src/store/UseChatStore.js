import { create } from "zustand";
import axiosInstance from "../config/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./UseAuthStore";
import { ShowMessageNotification } from "../components/ShowMessageNotification";

// Define Status types for better type checking
const ChatStatus = {
  IDLE: "idle",
  PENDING: "pending",
  SUCCESS: "success",
  ERROR: "error",
};

export const useChatStore = create((set, get) => ({
  // Data
  messages: [],
  users: [],
  selectedUser: null,
  typingStatus: {}, // To track typing status of users
  unreadMessages: {},

  // Status
  messageStatus: {
    isUserLoading: ChatStatus.IDLE,
    isMessagesLoading: ChatStatus.IDLE,
    isDeletingMessage: ChatStatus.IDLE,
  },

  // Actions
  // Get all users
  getUsers: async () => {
    try {
      set((state) => ({
        messageStatus: {
          ...state.messageStatus,
          isUserLoading: ChatStatus.PENDING,
        },
      }));

      // Making API call
      const response = await axiosInstance.get("/messages/users");

      set((state) => ({
        users: response.data,
        messageStatus: {
          ...state.messageStatus,
          isUserLoading: ChatStatus.SUCCESS,
        },
      }));
    } catch (error) {
      console.error("****Error GetUsers:", error);
      set((state) => ({
        messageStatus: {
          ...state.messageStatus,
          isUserLoading: ChatStatus.ERROR,
        },
      }));
      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      set((state) => ({
        messageStatus: {
          ...state.messageStatus,
          isUserLoading: ChatStatus.IDLE,
        },
      }));
    }
  },

  // Get all Messages for useToChat
  getMessages: async (userId) => {
    try {
      set((state) => ({
        messageStatus: {
          ...state.messageStatus,
          isMessagesLoading: ChatStatus.PENDING,
        },
      }));

      // Making API call
      const response = await axiosInstance.get(`messages/${userId}`);
      console.log(`GetMessages- ${response}`);

      set((state) => ({
        messages: response.data,
        messageStatus: {
          ...state.messageStatus,
          isMessagesLoading: ChatStatus.SUCCESS,
        },
      }));
    } catch (error) {
      console.error("****Error GetMessages:", error);
      set((state) => ({
        messageStatus: {
          ...state.messageStatus,
          isMessagesLoading: ChatStatus.ERROR,
        },
      }));
    } finally {
      set((state) => ({
        messageStatus: {
          ...state.messageStatus,
          isMessagesLoading: ChatStatus.IDLE,
        },
      }));
    }
  },

  // Send message
  sendMessage: async (messageData) => {
    // try {
    //   const { selectedUser, messages } = get();
    //   const response = await axiosInstance.post(
    //     `/messages/send/${selectedUser._id}`,
    //     messageData
    //   );
    // set({ messages: [...messages, response.data] });
    // set({ messages: [...messages, response.data.newMessage] }); //testing
    try {
      const { selectedUser } = get();
      await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
    } catch (error) {
      console.error("****Error SendMessages:", error);
      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    }
  },

  // Update message state to mark as deleted
  markMessageAsDeleted: (messageId, deletedAt) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === messageId ? { ...msg, isDeleted: true, deletedAt } : msg
      ),
    }));
  },

  // user typing setter
  setTypingStatus: (userId, status) =>
    set((state) => ({
      typingStatus: { ...state.typingStatus, [userId]: status },
    })),

  setUnreadMessage: (userId, value = true) =>
    set((state) => ({
      unreadMessages: { ...state.unreadMessages, [userId]: value },
    })),

  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    if (!selectedUser || !socket) return;

    // TODO : optimize this
    socket.on("new-message", (newMessage) => {
      // Check if message is from current chat
      if (
        selectedUser &&
        (newMessage.senderId === selectedUser._id ||
          newMessage.receiverId === selectedUser._id)
      ) {
        // Add message to current chat
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      } else {
        ShowMessageNotification(newMessage);
      }

      // for unread messages
      if (!selectedUser || selectedUser._id !== newMessage.senderId) {
        get().setUnreadMessage(newMessage.senderId, true);
      }

      // If the chat is opend with the sender of this message, mark as seen
      if (selectedUser && newMessage.senderId === selectedUser._id && socket) {
        socket.emit("mark-messages-seen", { senderId: selectedUser._id });
      }
    });

    // Subscribe to message deletions from both sender and receiver side
    socket.on("message-deleted", ({ messageId, deletedAt }) => {
      // Update the messages state to reflect the deletion
      get().markMessageAsDeleted(messageId, deletedAt);
    });

    // Subscribe or listen to "message-seen"
    socket.on("message-seen", ({ seenMessages }) => {
      set((state) => ({
        messages: state.messages.map((msg) => {
          const seenMsg = seenMessages?.find((sm) => sm.messageId === msg._id);
          if (seenMsg) {
            return { ...msg, seen: true, seenAt: seenMsg.seenAt };
          }
          return msg;
        }),
      }));
    });

    // Subscribe to user typing event
    socket.on("typing", ({ senderId }) => {
      get().setTypingStatus(senderId, true);
    });
    socket.on("stop-typing", ({ senderId }) => {
      get().setTypingStatus(senderId, false);
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("new-message");
    socket.off("message-deleted");
    socket.off("message-seen");
    socket.off("typing");
    socket.off("stop-typing");
  },

  // Delete message
  deleteMessage: async (messageID) => {
    try {
      set((state) => ({
        messageStatus: {
          ...state.messageStatus,
          isDeletingMessage: ChatStatus.PENDING,
        },
      }));
      // API call
      const response = await axiosInstance.post(
        `/messages/deleteMessageForEveryone/${messageID}`
      );
      console.log(response);

      // Server confirms deletion
      set((state) => ({
        messageStatus: {
          ...state.messageStatus,
          isDeletingMessage: ChatStatus.SUCCESS,
        },
      }));
    } catch (error) {
      console.error("****Error DeleteMessages:", error);

      // Revert the optimistic update on error
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageID
            ? { ...msg, isDeleted: false, deletedAt: null }
            : msg
        ),
        messageStatus: {
          ...state.messageStatus,
          isDeletingMessage: ChatStatus.ERROR,
        },
      }));

      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      set((state) => ({
        messageStatus: {
          ...state.messageStatus,
          isDeletingMessage: ChatStatus.IDLE,
        },
      }));
    }
  },

  // Setting selected user
  //TODO: optimise this one later
  // setSelectedUser: (user) => set({ selectedUser: user }),
  setSelectedUser: (user) => {
    set({ selectedUser: user });
    set((state) => ({
      unreadMessages: { ...state.unreadMessages, [user._id]: false },
    }));
  },
}));
