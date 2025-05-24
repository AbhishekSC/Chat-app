import mongoose from "mongoose";

// Creating message schema
const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Add index for query performance
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Add index for query performance
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    // Track if the message has been seen by the receiver
    seen: {
      type: Boolean,
      default: false,
    },
    seenAt: {
      type: Date,
      default: null,
    },
    // Delete for everyone - The message disappears for all users
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Creating message model
const Message = mongoose.model("Message", messageSchema);

// Exporting the message model
export default Message;
