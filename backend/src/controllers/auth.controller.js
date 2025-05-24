import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import generateAccessToken from "../services/generateToken.service.js";
import cloudinary from "../config/cloudinary.js";
import redisClient from "../config/redis.js";
import jwt from "jsonwebtoken";

// Check if user is authenticated
/*
 * What it does:
 * 1. Checks if the user is authenticated by verifying the JWT token.
 * 2. If authenticated, sends a response with user information.
 * 3. If not authenticated, sends an error response.
 */
export const checkAuth = (req, res) => {
  try {
    res.status(200).json({ message: "User is authenticated", user: req.user });
  } catch (error) {
    console.error("****Error in the checkAuth controller: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Updates user profile
 * optimizations, image processing, and cleanup
 * * What it does:
 * 1. Destructures the request body to extract profilePic.
 * 2. Checks if the profilePic is provided.
 * 3. Validates the image size (optional).
 * 4. Uploads the image to Cloudinary.
 * 5. Updates the user's profile picture in the database.
 * 6. Sends a response back to the client with the updated user data.
 * 7. Handles errors and sends appropriate error messages.
 */
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    // Input validation
    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    // validate file type and size (optional)

    // Check iamge size before uploading (5mb limit)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const imageSize = profilePic.length * 0.75;

    if (imageSize > MAX_SIZE) {
      return res
        .status(400)
        .json({ message: "Image too large. Maximum size is 5MB" });
    }

    // uploading image to cloudinary
    const uploadPicResponse = await cloudinary.uploader.upload(profilePic, {
      resource_type: "auto",
    });
    //file has been uploaded successfully
    console.log("File is uploaded on cloudinary : ", uploadPicResponse.url);

    // Updating user profile picture in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadPicResponse.secure_url },
      {
        new: true,
        select: "-password -failedLoginAttempts -accountLocked -__v", // Exclude sensitive fields
      }
    );

    res.status(200).json({
      message: "Profile picture updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("****Error in the updateProfile controller: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// User signup
/*
 * What it does:
 * 1. Destructures the request body to extract fullName, email, and password.
 * 2. Checks if all required fields are provided and validate email format.
 * 3. Validates the password length.
 * 4. Checks if the user already exists in the database.
 * 5. Hashes the password using bcrypt.
 * 6. Creates a new user in the database.
 * 7. Generates an access token for the user.
 * 8. Saves the new user to the database.
 * 9. Sends a response back to the client with the user data.
 * 10. Handles errors and sends appropriate error messages.
 */
export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    // Check if all fields are provided
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address" });
    }

    // Check if Password length is less than 6 characters
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    //Finding the user in the database
    const user = await User.findOne({ email });

    //Checking if the user already exists
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hashing password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Creating a new user
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // Generate access token
      generateAccessToken(newUser, res);
      // Saving user into the database
      await newUser.save();

      // Sending response
      return res.status(201).json({
        message: "User created successfully",
        user: sanitizeUserData(newUser),
      });
    } else {
      return res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("****Error in signup controller:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// User Login
/*
 * What it does:
 * 1. Destructures the request body to extract email and password.
 * 2. Checks if all required fields are provided.
 * 3. Finds the user by email in the database.
 * 4. Checks if the email or password is incorrect.
 * 5. Checks for account lock/restrictions.
 * 6. Compares the password with the hashed password in the database.
 * 7. Updates the failed login attempts if the password is incorrect.
 * 8. Resets failed login attempts on successful login.
 * 9. Generates an access token for the user.
 * 10. Updates the last login timestamp.
 * 11. Sends a response back to the client with the user data.
 * 12. Handles errors and sends appropriate error messages.
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Finding the user by email in the database
    const user = await User.findOne({ email });

    // Checking if the email or password is incorrect
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check for account lock/restrictions
    if (user.accountLocked) {
      return res
        .status(403)
        .json({ message: "Account is locked. Please contact support." });
    }

    // Comparing the password with the hashed password in the database
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    // Checking for password match
    if (!isPasswordCorrect) {
      // Updating the failed login attempts
      await handleFailedLoginAttempt(user);
      if (user.failedLoginAttempts === 3 && !isPasswordCorrect) {
        return res
          .status(401)
          .json({ message: "Warning: you have 2 login attempts remaining." });
      }
      if (user.failedLoginAttempts === 4 && !isPasswordCorrect) {
        return res
          .status(401)
          .json({ message: "Warning: you have 1 login attempts remaining." });
      }
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Checking for password match
    if (!isPasswordCorrect) {
      // Updating the failed login attempts
      await handleFailedLoginAttempt(user);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      await user.save();
    }

    // User credentials are valid
    // **Generate access token
    generateAccessToken(user, res);

    // Updating the last login timestamp
    updateLastLogin(user);

    //sending response
    return res.status(200).json({
      message: "Login successful",
      user: sanitizeUserData(user),
    });
  } catch (error) {
    console.error("****Error in the Login controller: ", error);
    res
      .status(500)
      .json({ message: "Authentication failed. Please try again later." });
  }
};

// User Logout
/*
 * What it does:
 * 1. Clears the authentication cookies from the client.
 * 2. Sends a response back to the client indicating successful logout.
 * 3. Handles errors and sends appropriate error messages.
 */
export const logout = async(req, res) => {
  try {

      // Extract token from cookie or header
    const token = req.cookies.accessToken || req.headers.authorization?.split(" ")[1];
    if (token) {
      // Decode token to get expiry
      const decoded = jwt.decode(token);
      const exp = decoded?.exp;
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = exp ? exp - now : 60 * 60; // fallback 1 hour
      
      // Blacklist the token in Redis
      await redisClient.set(token, "blacklisted", { EX: expiresIn });
    }

    // Clear authentication cookies
    const cookieOptions = {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV !== "development",
      //   domain: process.env.COOKIE_DOMAIN,
      maxAge: 0, // Set maxAge to 0 to delete the cookie immediately
    };

    res.cookie("accessToken", "", cookieOptions);

    // Send a response indicating successful logout
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.log("****Error in the Logout controller: ", error);
    return res
      .status(500)
      .json({ message: "Logout failed. Please try again later." });
  }
};

// Utility function for Login controller
/**
 * Update user's failed login attempts
 */
async function handleFailedLoginAttempt(user) {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

  // Lock account after multiple failed attempts (optional)
  if (user.failedLoginAttempts >= 5) {
    user.accountLocked = true;
  }

  await user.save();
}

/**
 * Update user's last login timestamp
 */
async function updateLastLogin(user) {
  user.lastLoginAt = new Date();
  await user.save();
}

/**
 * Remove sensitive data from user object
 */
function sanitizeUserData(user) {
  const userData = user.toObject ? user.toObject() : { ...user };

  // Remove sensitive fields
  delete userData.password;
  delete userData.accountLocked;

  return userData;
}
