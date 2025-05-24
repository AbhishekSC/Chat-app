import express from "express";
import isAuthenticated from "../middlewares/auth.middleware.js";
import {
  getAllUsers,
  getConversationMessages,
  deleteMessageForEveryone,
  sendMessage,
} from "../controllers/message.controller.js";

// Initializing the router
const router = express.Router();

// Routes
// Get all users
// * This route is used to fetch all users from the database excluding the logged in user.
// * It uses the isAuthenticated middleware to ensure that only authenticated users can access it.
router.get("/users", isAuthenticated, getAllUsers);
// Get messages by user ID
// * This route is used to fetch messages for a specific user by their ID.
// * It uses the isAuthenticated middleware to ensure that only authenticated users can access it.
router.get("/:id", isAuthenticated, getConversationMessages);
// Delete message route- delete for everyone
// router.get("/delete/:id", isAuthenticated, deleteMessageForEveryone);
router.post("/deleteMessageForEveryone/:id", isAuthenticated, deleteMessageForEveryone);
// Send message route
router.post("/send/:id", isAuthenticated, sendMessage);
// router.post("/markAsSeen/:id", isAuthenticated, sendMessage);

export default router;
