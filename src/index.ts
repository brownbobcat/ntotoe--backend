import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth.routes";
import taskRoutes from "./routes/task.routes";
import boardRoutes from "./routes/board.routes";
import columnRoutes from "./routes/column.routes";
import organizationRoutes from "./routes/organization.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

const main = async () => {
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error("Database connection failed. Exiting application.");
    process.exit(1);
  }
  await initializeServer();
};

const initializeServer = async () => {
  console.log("Initializing Express Server...");

  app.use(express.json());

  console.log("Configuring CORS...");
  app.use(
    cors({
      origin: [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "https://ntotoe-frontend-pink.vercel.app",
      ],
    })
  );

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/board", boardRoutes);
  app.use("/api/column", columnRoutes);
  app.use("/api/organization", organizationRoutes);

  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });

  console.log("Express Server Initialized!");
};

main().catch((error) => {
  console.error("Server initialization failed:", error);
  process.exit(1);
});
