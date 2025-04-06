import mongoose from "mongoose";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
dotenv.config();

const app = express();
const port = 5000;

app.use(
  cors({
    origin: "https://addis-uni.netlify.app",
    credentials: true, // Allow requests from this origin
  })
);
app.use(express.json());

// eslint-disable-next-line no-undef
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.use("/auth", authRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
