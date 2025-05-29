import React, { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/UseChatStore";
import toast from "react-hot-toast";
import { Image, Send, X } from "lucide-react";
import { useAuthStore } from "../store/UseAuthStore";

export default function MessageInput() {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const { selectedUser, typingStatus } = useChatStore();
  const { authUser, socket } = useAuthStore();

  // --- Typing indicator logic ---
  const typingTimeoutRef = useRef();

  const handleInputChange = (e) => {
    setText(e.target.value);

    if (!socket || !selectedUser || !authUser) return;

    // Emit typing event
    socket.emit("typing", {
      receiverId: selectedUser._id,
      senderId: authUser.user._id,
    });

    console.log(
      "#######typingStatus",
      typingStatus,
      "selectedUser",
      selectedUser
    );

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Emit stop-typing after 1s of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", {
        receiverId: selectedUser._id,
        senderId: authUser.user._id,
      });
    }, 1000);
  };

  //   useEffect(() => {
  //   if (!socket) return;
  //   socket.on("typing", (data) => {
  //     console.log("Received typing event:", data);
  //   });
  //   return () => {
  //     socket.off("typing");
  //   };
  // }, [socket]);

  // Actions
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // const HandleSendMessage = async (e) => {
  //   e.preventDefault();

  //   if (!text.trim() && !imagePreview) {
  //     return;
  //   }
  //   const payload = { text: text.trim(), image: imagePreview };

  //   // Emit typing event
  //   socket.emit("typing", {
  //     toUserId: selectedUser._id,
  //     fromUserId: authUser._id,
  //   });

  //   clearTimeout(typingTimeout);
  //   typingTimeout = setTimeout(() => {
  //     socket.emit("stop-typing", {
  //       toUserId: selectedUser._id,
  //       fromUserId: authUser._id,
  //     });
  //   }, 1000); // 1 second after user stops typing

  //   try {
  //     await sendMessage(payload);
  //     // Clear form
  //     setText("");
  //     setImagePreview(null);
  //     if (fileInputRef.current) fileInputRef.current.value = "";
  //   } catch (error) {
  //     console.error("Failed to send message: ", error);
  //   }
  // };

  const HandleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    const payload = { text: text.trim(), image: imagePreview };
    try {
      await sendMessage(payload);
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Optionally emit stop-typing immediately after sending
      if (socket && selectedUser && authUser) {
        socket.emit("stop-typing", {
          receiverId: selectedUser._id,
          senderId: authUser.user._id,
        });
      }
    } catch (error) {
      console.error("Failed to send message: ", error);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="p-4 w-full">
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* Typing indicator */}
      {typingStatus[selectedUser._id] &&
        selectedUser._id !== authUser.user._id && (
          <div
            className="flex items-center gap-2 mt-0 mb-1 px-3 py-1 rounded-full w-fit shadow-sm"
            style={{ maxWidth: 220 }}
          >
            {/* <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
              {selectedUser.fullName} is typing
            </span> */}
            
            <span className="flex items-center ml-1">
              <span
                className="dot bg-emerald-500 animate-bounce"
                style={{ animationDelay: "0s" }}
              ></span>
              <span
                className="dot bg-emerald-500 animate-bounce"
                style={{ animationDelay: "0.15s" }}
              ></span>
              <span
                className="dot bg-emerald-500 animate-bounce"
                style={{ animationDelay: "0.3s" }}
              ></span>
            </span>
            <style>
              {`
        .dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin: 0 1px;
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(1); }
          40% { transform: scale(1.4); }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}
            </style>
          </div>
        )}
      {/* Typing indicator */}

      {/* Form */}
      <form onSubmit={HandleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={handleInputChange}
          />
          {/* onChange={(e) => setText(e.target.value)} */}

          <input
            type="file"
            className="hidden"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
}
