import express from "express";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

// environemnt variables defined in kubernetes deployments
import "dotenv/config.js";
import keys from "./config/keys";
import swaggerDocument from "../swagger/auth-api.json";
import { authRouter } from "./routes/auth";
import { errorHandler } from "./middlewares/errorHandler";

const startServer = async () => {
  const app = express();
  app.set("trust proxy", true);

  // check environemnt variables
  if (!keys.DATABASE || !keys.JWT_KEY || !keys.NODE_ENV)
    throw new Error("environment variable not defined");

  const PORT = parseInt(`${keys.PORT}`) || 5000;

  // middleware
  app.use(bodyParser.json());

  // set up JWT support
  app.use(
    cookieSession({
      // JWT token is encrypted.
      // Hence turn off built-in encryption support as other microservices might not be in node
      signed: false,
      name: "session",
      //TODO:
      // this option is valid over HTTPS connection, right now dev environment
      // this option will send cookie over secure connection
      //secure: true,
    })
  );
  // api-documentation
  app.use(
    "/api/users/auth-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
  );

  // routes
  app.use(authRouter);

  // error-handler
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`auth service running on ${PORT}`);
  });
};

startServer();
