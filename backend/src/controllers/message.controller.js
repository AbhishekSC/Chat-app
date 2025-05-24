import cloudinary from "../config/cloudinary.js";
import { getReceiverSocketId } from "../config/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { io } from "../config/socket.js";
import redisClient from "../config/redis.js";

/*
 * Fetches all users from the database excluding the logged in user
 * What it does:
 * 1. Gets the logged in user id from the request object.
 * 2. Fetches all users from the database excluding the logged in user.
 * 3. Checks if users are found or not.
 * 4. Sends the response with the list of users.
 * 5. Handles errors and sends appropriate error messages.
 */
export const getAllUsers = async (req, res) => {
  try {
    // Getting logged in user id from the request object
    const loggedInUser = req.user.id;
    const cacheKey = `users:except:${loggedInUser}`;

    // 1. Try to get the users from REDIS cache
    const cachedUsers = await redisClient.get(cacheKey);
    const start = Date.now();
    if (cachedUsers) {
      console.log("Cache hit, time:", Date.now() - start, "ms");
      return res.status(200).json(JSON.parse(cachedUsers));
    }

    // 2. If not cached, fetch from DB
    // Fetching all users from the database excluding the logged in user
    const users = await User.find({ _id: { $ne: loggedInUser } }).select(
      "-password -failedLoginAttempts -__v"
    );
    console.log("DB hit, time:", Date.now() - start, "ms");

    // Checking if users are found or not
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    // 3. Cache the result in the REDIS for about 5 minutes
    await redisClient.set(cacheKey, JSON.stringify(users), { EX: 300 });

    // Sending the response with the list of users
    return res.status(200).json(users);
  } catch (error) {
    console.error("****Error in the getAllUsers controller: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/*
 * Fetches messages between the logged in user and the user to chat with
 * What it does:
 * 1. Gets the user id of the user to chat with from the request parameters.
 * 2. Gets the logged in user id from the request object.
 * 3. Fetches the messages between the logged in user and the user to chat with.
 * 4. Checks if messages are found or not.
 * 5. Sends the response with the list of messages.
 * 6. Handles errors and sends appropriate error messages.
 */
export const getConversationMessages = async (req, res) => {
  try {
    // Getting the user if from the request parameters: userToChatWithId
    // This is the user id of the user we want to chat with
    const { id: userToChatWithId } = req.params;

    // Getting the logged in user id from the request object: Me
    // This is the user id of the logged in user
    const loggedInUserId = req.user.id;

    if (!userToChatWithId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Create a unique cache key for this conversation
    const cacheKey = `messages:${[loggedInUserId, userToChatWithId]
      .sort()
      .join(":")}`;
    const start = Date.now();

    // First, try to get the messages from REDIS cache
    const cachedMessages = await redisClient.get(cacheKey);
    if (cachedMessages) {
      console.log("Cache hit for messages, time:", Date.now() - start, "ms");
      const messages = JSON.parse(cachedMessages);
      return res.status(200).json(messages);
    }

    // If not cached, fetch from DB
    // Fetching the messages between the logged in user and the user to chat with
    const messages = await Message.find({
      // Only get messages that haven't been globally deleted (Delete for everyone)
      // isDeleted: false,
      // Only get messages that are between the logged in user and the user to chat with
      $or: [
        { senderId: loggedInUserId, receiverId: userToChatWithId },
        { senderId: userToChatWithId, receiverId: loggedInUserId },
      ],
    }).sort({ createdAt: 1 }); // Sorting the messages by createdAt field in ascending order

    console.log("DB hit for messages, time:", Date.now() - start, "ms");

    // Cache the messages in REDIS for 2 minute to avoid frequent DB hits and fresh data
    await redisClient.set(cacheKey, JSON.stringify(messages), { EX: 120 });

    // Update all unseen messages from the other user to seen
    const updateResult = await Message.updateMany(
      {
        senderId: userToChatWithId,
        receiverId: loggedInUserId,
        seen: false,
      },
      {
        $set: {
          seen: true,
          seenAt: new Date(),
        },
      }
    );

    //TESITNG- realtime seen functionality
    // Emit "message-seen" event to the sender if any messages were updated
    if (updateResult.modifiedCount > 0) {
      // Invalidate the cache when messages are marked as seen
      await redisClient.del(cacheKey);

      const senderSocketId = getReceiverSocketId(userToChatWithId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("message-seen", {
          receiverId: loggedInUserId, // The receiver who just saw the messages
          seenAt: new Date(),
        });
      }
    }

    return res.status(200).json(messages);
  } catch (error) {
    console.error("****Error in the getMessages controller: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/*
 * Deletes a message for everyone in the conversation (Delete for everyone)
 * What it does:
 * 1. Gets the message id from the request parameters.
 * 2. Gets the logged in user id from the request object.
 * 3. Finds the message by id.
 * 4. Checks if message exists.
 * 5. Checks if the user is the sender of the message.
 * 6. Checks if the message is within the time limit for deletion.
 * 7. Sets isDeleted to true and records deletion timestamp.
 * 8. Sends the response with success message.
 * 9. Handles errors and sends appropriate error messages.
 */

export const deleteMessageForEveryone = async (req, res) => {
  try {
    // Getting the message id from the request parameter
    // const { id: messageId } = req.params;
    const { id: messageId } = req.params;

    // Getting the logged in user id
    const loggedInUserId = req.user.id;

    // Finding the message by id
    const message = await Message.findById(messageId);

    // Checking if message exists
    if (!message) {
      return res.status(400).json({ message: "Message not found" });
    }

    // Checking if the loggedInUserId is the sender of the message (only sender can delete for everyone)
    if (!message.senderId.equals(loggedInUserId)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this message" });
    }

    //  Check if message is too old to delete (e.g., 1 hour limit)
    const messageAge = Date.now() - message.createdAt.getTime();
    const MAX_DELETE_AGE = 60 * 60 * 1000; // 1 hour in milliseconds

    if (messageAge > MAX_DELETE_AGE) {
      return res.status(400).json({
        message: "Messages older than 1 hour cannot be deleted for everyone",
      });
    }

    // Setting isDeleted to true and recording deletion timestamp
    message.isDeleted = true;
    // message.text = "This message was deleted";
    message.deletedAt = new Date();

    // Saving the updated message to the database
    await message.save();

    // Invalidate the cache for this conversation
    const cacheKey = `messages:${[loggedInUserId, message.receiverId]
      .sort()
      .join(":")}`;
    await redisClient.del(cacheKey);

    // Real-time message deletion using socket.io
    const deletionPayload = {
      messageId: message._id,
      deletedAt: message.deletedAt,
    };

    // Get receiver's socket ID
    const receiverSocketId = getReceiverSocketId(message.receiverId);

    // Emit 'message-deleted' event to the receiver if they are online
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message-deleted", deletionPayload);
    }

    // Get sender's socket ID
    const senderSocketId = getReceiverSocketId(loggedInUserId); // Using the same function but for sender ID

    // Emit 'message-deleted' event to the sender as well if they are online
    // This ensures both sides of the conversation get the update
    if (senderSocketId) {
      io.to(senderSocketId).emit("message-deleted", deletionPayload);
    }

    return res.status(200).json({
      message: "Message deleted for everyone",
    });
  } catch (error) {
    console.error(
      "****Error in the deleteMessageForEveryone controller: ",
      error
    );
    res.status(500).json({ message: "Internal server error" });
  }
};

/*
 * Sends a message to the user to chat with
 * What it does:
 * 1. Gets the message and image from the request body.
 * 2. Gets the user id of the user to chat with from the request parameters.
 * 3. Gets the logged in user id from the request object.
 * 4. Checks if the sender and receiver are the same.
 * 5. Uploads the image to Cloudinary or any other storage service and gets the URL.
 * 6. Creates a new message object.
 * 7. Saves the message to the database.
 * 8. Sends the response back to the client.
 * 9. Handles errors and sends appropriate error messages.
 */
export const sendMessage = async (req, res) => {
  try {
    // Getting the message and image from the request body
    const { text, image } = req.body;
    // Getting the user id of the user to chat with from the request parameters
    const { id: userToChatWithId } = req.params; // ReceiverID
    // Getting the logged in user id from the request object
    const loggedInUserId = req.user._id; //senderID

    // Prevent sending message to self
    if (userToChatWithId === loggedInUserId) {
      return res
        .status(400)
        .json({ message: "You cannot send a message to yourself" });
    }

    let imageUrl = undefined;
    // Check if the image is provided
    if (image) {
      // Assuming the image is a base64 string, you can save it to a file or cloud storage and get the URL
      // Upload the image to Cloudinary or any other storage service and get the URL
      const uploadImageResponse = await cloudinary.uploader.upload(image);
      // Get the secure URL of the uploaded image
      imageUrl = uploadImageResponse.secure_url;
    }

    // Fetch the user from the database using the decoded token information
    // Finding the user by email in the database
    const user = await User.findById(loggedInUserId);

    // Create a new message object
    const newMessage = new Message({
      senderId: loggedInUserId,
      receiverId: userToChatWithId,
      text,
      image: imageUrl,
      seen: false,
    });

    // Save the message to the database
    await newMessage.save();

    // Invalidate the cache for this conversation
    const cacheKey = `messages:${[loggedInUserId, userToChatWithId]
      .sort()
      .join(":")}`;
    await redisClient.del(cacheKey);

    // Real-time message sending using socket.io to both users
    const messagePayload = newMessage.toObject(); // Convert mongoose document to plain object
    const messagePayloadUpdatedWithSenderInfo = {
      ...messagePayload,
      fullName: user.fullName,
      profilePic: user.profilePic,
    };
    const senderSocketId = getReceiverSocketId(loggedInUserId); // Assuming function works for any user ID
    const receiverSocketId = getReceiverSocketId(userToChatWithId);

    if (senderSocketId)
      io.to(senderSocketId).emit(
        "new-message",
        messagePayloadUpdatedWithSenderInfo
      );
    if (receiverSocketId)
      io.to(receiverSocketId).emit(
        "new-message",
        messagePayloadUpdatedWithSenderInfo
      );

    // Send the response back to the client
    return res.status(201).json({
      message: "Message sent successfully",
      messagePayloadUpdatedWithSenderInfo,
    });
  } catch (error) {
    console.error("****Error in the sendMessage controller: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
