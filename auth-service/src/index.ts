// environemnt variables defined in kubernetes deployments
import "dotenv/config.js";
import { app } from "./app";
import { Express } from "express";

const startServer = async (app: Express) => {
  // check environemnt variables
  if (!process.env.DATABASE || !process.env.JWT_KEY || !process.env.NODE_ENV)
    throw new Error("environment variable not defined");

  const PORT = parseInt(`${process.env.PORT}`) || 5000;

  app.listen(PORT, () => {
    console.log(`auth service running on ${PORT}`);
  });
};

startServer(app);
