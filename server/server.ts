import express, { Request, Response, NextFunction } from "express";
import "dotenv/config";
import path from "node:path";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import userRouter from "./routes/userRoutes.js";
import projectRouter from "./routes/projectRoutes.js";

const app = express();
const authHandler = toNodeHandler(auth);

const port = 3000;

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

const corsOptions = {
  origin: process.env.TRUSTED_ORIGINS?.split(",") || [],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(
  "/api/auth",
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("[auth request]", req.method, req.path);
    try {
      await (authHandler as any)(req, res);
    } catch (err) {
      console.error("[auth handler error]", err);
      next(err);
    }
  },
);

app.use(express.json({ limit: "50mb" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req: Request, res: Response) => {
  res.send("Server is Live!");
});
app.use("/api/user", userRouter);
app.use("/api/project", projectRouter);

app.use((err: unknown, _req: Request, res: Response, _next: unknown) => {
  console.error("[express-error]", err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
