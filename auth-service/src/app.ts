import express from "express";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

import swaggerDocument from "../swagger/auth-api.json";
import { authRouter } from "./routes/auth";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();
app.set("trust proxy", true);

// set up JWT support
app.use(
  cookieSession({
    // JWT token is encrypted.
    // Hence turn off built-in encryption support as other microservices might not be in node
    signed: false,
    name: "session",
    secure: process.env.NODE_ENV === "production",
  })
);
// middleware
app.use(bodyParser.json());

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

export { app };
