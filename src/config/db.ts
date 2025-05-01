import * as dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const URI = process.env.MONGO_DB_URI!;

export async function connectDB() {
  try {
    await mongoose.connect(URI);
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    return false;
  }
}

export { mongoose };
