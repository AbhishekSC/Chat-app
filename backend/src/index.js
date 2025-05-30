import dotenv from "dotenv";
import express from "express";
import { connectToMongoDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app, server } from "./config/socket.js";
import morgan from "morgan";
import fs from "fs";
import path from "path";

// Importing routers
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";

dotenv.config();

// dev-server.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Use dynamic import for ES modules
import("./server.js").catch((err) => {
  console.error("Failed to import server:", err);
});

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Initialize express app
// const app = express();
// Integrating socket.io

// ** Logging
// Create a write stream (in append mode)
if (process.env.NODE_ENV !== "production") {
  const accessLogStream = fs.createWriteStream(
    path.join(process.cwd(), "access.log"),
    { flags: "a" }
  );

  // Use morgan to log requests to the file
  app.use(morgan("combined", { stream: accessLogStream }));
}
// (Optional) Also log to console in production
else {
  app.use(morgan("combined"));
}

// Middlewares:
// ***To parse JSON requests***
app.use(express.json({ limit: "50mb" }));
// ***To parse URL-encoded data***
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
// ***To enable CORS (Cross-Origin Resource Sharing)***
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? "https://secretwire.onrender.com" // <-- your frontend domain
      : "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Authorization"],
};

app.use(cors(corsOptions));

app.use(cors(corsOptions));
// ***To parse cookies***
app.use(cookieParser());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Database connection and server initialization
async function startServer() {
  try {
    // First connecting to the database
    connectToMongoDB(MONGODB_URI);

    // Start the server after successfull database connection
    server.listen(PORT, () => {
      console.log(`****Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("****Error starting the server:", error);
  }
}

// Start the server
startServer();
