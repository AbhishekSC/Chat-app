import mongoose from "mongoose";

async function connectToMongoDB(MONGODB_URI) {
  try {
    const connectionInstance = await mongoose.connect(MONGODB_URI);
    console.log(
      `****MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("****Successfully connected to MongoDB****");
    // process --> current application jo run ho rhi h ushka reference hai process
    process.exit(1);
  }
}

export { connectToMongoDB };
