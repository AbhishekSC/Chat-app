import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import Message from "../models/message.model.js";

// Creating server
const app = express();
const server = createServer(app);

// Socket.io integration | creating scoketIO server which will listen regular HTTP request and websocket communication(Duplex)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Used to store the online users
const userSocketMap = {}; // {userId(db): SocketId(socketIO)}

// Listening to events
io.on("connection", (socket) => {
  // Setting up userID to SocketID
  const userId = socket.handshake.query.userId; // passing from client
  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  //io.emit() -> send the events to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  /*
    Backend: Emit Per-Message Seen Info
    Update your socket handler to emit an array of seen messages with their individual seenAt timestamps:
  */
  socket.on("mark-messages-seen", async ({ senderId }) => {
    const receiverId = userId;
    // Find all unseen messages
    const unseenMessages = await Message.find({
      senderId,
      receiverId,
      seen: false,
    });

    const seenMessages = [];
    for (const msg of unseenMessages) {
      msg.seen = true;
      msg.seenAt = new Date();
      await msg.save();
      seenMessages.push({ messageId: msg._id.toString(), seenAt: msg.seenAt });
    }

    if (seenMessages.length > 0) {
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("message-seen", {
          receiverId,
          seenMessages,
        });
      }
    }
  });

  /*
    when user start typing
    Emit an event to the receiver when the sender starts typing
  */
  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId });
    }
  });

  socket.on("stop-typing", ({ senderId, receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stop-typing", { senderId });
    }
  });

  // When user disconnect
  socket.on("disconnect", () => {
    console.log(`A user disconnected- ${socket.id}`);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
