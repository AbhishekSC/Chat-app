import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URI;
if (!redisUrl) {
  throw new Error("REDIS_URI is not defined in environment variables.");
}

const redisClient = createClient({ url: redisUrl });

redisClient.on("connect", () => {
  console.log("✅ Redis client connecting...");
});

redisClient.on("ready", () => {
  console.log("✅ Redis client connected and ready!");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
});

redisClient.on("end", () => {
  console.log("❗ Redis client disconnected.");
});

// Connect to Redis
redisClient.connect().catch((err) => {
  console.error("❌ Redis connection failed:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await redisClient.quit();
  console.log("Redis client closed. Exiting process.");
  process.exit(0);
});

export default redisClient;
