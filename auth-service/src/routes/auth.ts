import express, { NextFunction, Response, Request } from "express";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

import { PasswordManager } from "../services/passwordManager";
import { ReqAnnotateBodyString } from "../types/interfaceRequest";

import {
  validEmail,
  requireEmailInUse,
  validPassword,
  validateRequest,
} from "../middlewares/validators";
import { currentUser } from "../middlewares/currentUser";
import { User } from "../model/user";

// TODO: convert them into improts from one file: These are all custom error imports
import { DatabaseErrors } from "../errors/databaseErrors";
import { logErrorMessage } from "../errors/customError";
import { BadRequestError } from "../errors/badRequestError";

const router = express.Router();

router.post(
  "/api/users/signup",
  // validation
  [validEmail, validPassword, requireEmailInUse, validateRequest],
  async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) throw new BadRequestError("Invalid user input");
      // hash password before saving
      const hashedPassword = await PasswordManager.toHash(password);

      // create user
      const _id = new ObjectId();
      const userArray = await User.insertUser({
        _id,
        email,
        password: hashedPassword,
      });

      if (!userArray) throw new DatabaseErrors("unable to create user");
      const [user] = userArray;
      const userNormalize = User.normalizeUserProps(user);
      // Generate JWT token
      const userJWT = jwt.sign(
        {
          id: user._id,
          email: user.email,
        },
        process.env.JWT_KEY!
      );
      req.session = {
        jwt: userJWT,
      };

      res.status(201).send({ data: userNormalize });
    } catch (err) {
      logErrorMessage(err);
      next(err);
    }
  }
);

// signin route
router.post(
  "/api/users/signin",
  [validEmail, validPassword, validateRequest],
  async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      // find if email exists in db
      if (!email || !password) throw new BadRequestError("Invalid user input");
      const existingUser = await User.userByEmail(email);
      if (!existingUser || existingUser.length < 1)
        throw new BadRequestError("Invalid Credentials");

      // compare database password to supplied password
      const [user] = existingUser;
      const storedPassword = user.password;
      if (!storedPassword) throw new Error("no password found in database");
      const passwordMatch = await PasswordManager.compare(
        storedPassword,
        password
      );
      if (!passwordMatch) throw new BadRequestError("Invalid Credentials");

      // send JWT token to user
      const userJWT = jwt.sign(
        {
          id: user._id,
          email: user.email,
        },
        process.env.JWT_KEY!
      );
      req.session = {
        jwt: userJWT,
      };
      const userNormalize = User.normalizeUserProps(user);
      res.status(200).send({ data: userNormalize });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/api/users/currentuser",
  // our client will make request to this end point to find out if the user is logged in.
  // Other microservices will not make a request to this end point and will verify user using JWT Token
  [currentUser],
  async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
    res
      .set("Content-Type", "application/json")
      .status(200)
      .send({ currentUser: req.currentUser || null });
  }
);

router.post(
  "/api/users/signout",
  (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
    req.session = null;

    res.status(200).send({});
  }
);

router.post(
  "/api/users/destroy",
  async (req: ReqAnnotateBodyString, res: Response, next: NextFunction) => {
    try {
      const { id } = req.body;
      const parsedId = new ObjectId(id);
      const deleteUser = await User.deleteUser(parsedId);
      res.status(201).send({ data: deleteUser });
    } catch (err) {
      logErrorMessage(err);
      next(err);
    }
  }
);

export { router as authRouter };
