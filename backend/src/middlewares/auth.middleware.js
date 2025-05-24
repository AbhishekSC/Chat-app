import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

import dotenv from "dotenv";
import redisClient from "../config/redis.js";

// Load environment variables
dotenv.config();

// Security constants with failsafe defaults
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    console.warn(
      "WARNING: JWT_SECRET not defined in environment variables, using random secret"
    );
    return crypto.randomBytes(64).toString("hex"); // Using 64 bytes for better security
  });

/**
 * Authentication middleware to protect routes
 * Verifies JWT tokens and attaches user data to request
 * What it does:
 * 1. Extracts the token from the request headers or cookies.
 * 2. Verifies the token using the JWT secret.
 * 3. Fetches the user from the database using the decoded token information.
 * 4. Checks if the user account is locked or deactivated.
 * 5. Attaches the user information to the request object for further use in the application.
 * 6. Proceeds to the next middleware or route handler.
 * 7. Handles errors and sends appropriate error messages.
 *
 */
async function isAuthenticated(req, res, next) {
  try {
    // Extract the token from the request headers or cookie
    const token =
      req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if token is blacklisted in Redis
    const isBlacklisted = await redisClient.get(token);
    if (isBlacklisted) {
      return res
        .status(401)
        .json({ message: "Token is blacklisted. Please log in again." });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid authentication token" });
    }

    // Fetch the user from the database using the decoded token information
    const user = await User.findById(decoded.id).select(
      "-password -failedLoginAttempts -__v"
    );

    // Check if account is locked
    if (user.accountLocked) {
      return res.status(403).json({
        message: "Account is locked",
      });
    }

    // Check if the user is deactivated or not found
    if (!user) {
      return res.status(404).json({ message: "User not found or deactivated" });
    }

    // Attach the user information to the request object for further use in the application
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("****Error in the isAuthenticated middleware: ", error);
    return res.status(500).json({ message: "Authentication service error" });
  }
}

export default isAuthenticated;
