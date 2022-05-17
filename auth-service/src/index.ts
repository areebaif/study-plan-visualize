// environemnt variables defined in kubernetes deployments
import "dotenv/config.js";
import keys from "./config/keys";
import { app } from "./app";
import { Express } from "express";

const startServer = async (app: Express) => {
  // check environemnt variables
  if (!keys.DATABASE || !keys.JWT_KEY || !keys.NODE_ENV)
    throw new Error("environment variable not defined");

  const PORT = parseInt(`${keys.PORT}`) || 5000;

  app.listen(PORT, () => {
    console.log(`auth service running on ${PORT}`);
  });
};

startServer(app);
