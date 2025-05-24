import { useCallback, useEffect, useState, Fragment, useRef } from "react";
import { useChatStore } from "../store/UseChatStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/UseAuthStore";
import ImagePreview from "./ImagePreview";
import {
  formatMessageTime,
  formatMessageTimeForSeen,
} from "../utils/formateMessageTime";
import { Trash, Ban, CheckCheck, Check } from "lucide-react";

export default function ChatContainer() {
  // Track which message ID is being hovered over instead of a boolean flag
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const messageRef = useRef(null);
  const containerRef = useRef(null);

  const [previewImage, setPreviewImage] = useState(null);

  const {
    getMessages,
    messageStatus,
    selectedUser,
    messages,
    deleteMessage,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();

  const handleDeleteMessage = useCallback(
    (messageID) => {
      try {
        if (messageID) {
          deleteMessage(messageID);
        }
      } catch (error) {
        console.error(`Error while deleting message- ${error}`);
      }
    },
    [deleteMessage]
  );

  // realtime seen
  useEffect(() => {
    if (selectedUser && socket) {
      socket.emit("mark-messages-seen", { senderId: selectedUser._id });
    }
  }, [selectedUser, socket]);

  // Get messages when selected user changes
  useEffect(() => {
    unsubscribeFromMessages();
    if (selectedUser && selectedUser._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
    }

    return () => unsubscribeFromMessages();
  }, [
    selectedUser,
    getMessages,
    selectedUser._id,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageRef.current && messages?.length > 0) {
      setTimeout(() => {
        messageRef.current.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages]);

  if (messageStatus.isMessagesLoading === "pending") {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  // Helper function to render message content based on deletion status
  const renderMessageContent = (message) => {
    if (message.isDeleted) {
      return (
        <div className="flex items-center text-gray-500 italic">
          <Ban size={14} className="mr-1" />
          <span>This message was deleted</span>
        </div>
      );
    }

    return (
      <>
        {message.image && (
          <img
            src={message.image}
            alt="attachment"
            className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setPreviewImage(message.image)}
          />
        )}
        {message.text && <p>{message.text}</p>}
      </>
    );
  };

  // Helper function to render message status indicators
  const renderMessageStatus = (message) => {
    if (message.isDeleted) {
      return `Deleted at ${formatMessageTime(message.deletedAt)}`;
    }

    if (message.seen) {
      return (
        <div className="flex items-center">
          <CheckCheck size={16} className="mr-1 text-blue-500" />
          <span>Seen at {formatMessageTimeForSeen(message.seenAt)}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <Check size={16} className="mr-1" />
          <span>Delivered</span>
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={containerRef}>
        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1;

          return (
            <Fragment>
              {/* Sender or me */}
              {message.senderId === authUser.user._id && (
                <div
                  className="chat chat-end"
                  ref={isLastMessage ? messageRef : null}
                  key={message._id}
                >
                  <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                      <img
                        src={authUser.user.profilePic || "/avatar.png"}
                        alt="profile pic"
                      />
                    </div>
                  </div>
                  <div className="chat-header">
                    <time className="text-xs opacity-50">
                      {formatMessageTime(message.createdAt)}
                    </time>
                  </div>

                  {/* Message bubble with delete option on hover */}
                  <div
                    className={`chat-bubble flex flex-col relative ${
                      message.isDeleted ? "bg-gray-200 text-gray-600" : ""
                    }`}
                    onMouseEnter={() => setHoveredMessageId(message._id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    {/* Delete button that appears only when this specific message is hovered */}
                    {hoveredMessageId === message._id &&
                      message.senderId === authUser.user._id &&
                      !message.isDeleted && (
                        <button
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                          onClick={() => handleDeleteMessage(message._id)}
                          aria-label="Delete message"
                        >
                          <Trash size={12} />
                        </button>
                      )}

                    {renderMessageContent(message)}
                  </div>

                  {/* Dynamic seen status for sent messages */}
                  <div className="chat-footer opacity-50">
                    {renderMessageStatus(message)}
                  </div>
                </div>
              )}
              {/* UserToChatWith */}
              {message.senderId !== authUser.user._id && (
                <div
                  className="chat chat-start"
                  ref={isLastMessage ? messageRef : null}
                  key={message._id}
                >
                  <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                      <img
                        src={selectedUser.profilePic || "/avatar.png"}
                        alt="profile pic"
                      />
                    </div>
                  </div>
                  <div className="chat-header">
                    <time className="text-xs opacity-50">
                      {formatMessageTime(message.createdAt)}
                    </time>
                  </div>
                  <div
                    className={`chat-bubble flex flex-col ${
                      message.isDeleted ? "bg-gray-200 text-gray-600" : ""
                    }`}
                  >
                    {renderMessageContent(message)}
                  </div>
                  {message.isDeleted && (
                    <div className="chat-footer opacity-50">
                      Deleted at {formatMessageTime(message.deletedAt)}
                    </div>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {previewImage && (
        <ImagePreview
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}

      <MessageInput />
    </div>
  );
}
