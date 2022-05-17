import { NextFunction, Response } from "express";
import { body, validationResult } from "express-validator";
import { ReqAnnotateBodyString } from "../types/interfaceRequest";
import { User } from "../model/user";
import { BadRequestError } from "../errors/badRequestError";
import { RequestValidationErrors } from "../errors/requestValidationErrors";

export const validEmail = body("email")
  .trim()
  .normalizeEmail()
  .isEmail()
  .withMessage("Must be a valid email");

export const validPassword = body("password")
  .trim()
  .notEmpty()
  .withMessage("Password must be supplied");

export const requireEmailInUse = async (
  req: ReqAnnotateBodyString,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  try {
    if (!email) throw new BadRequestError("Bad Request: Invalid user input");
    const user = await User.userByEmail(email);
    if (user && user.length > 0)
      throw new BadRequestError("Email in Use: Please provide another email");
  } catch (err) {
    next(err);
  }

  next();
};

export const validateRequest = (
  req: ReqAnnotateBodyString,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new RequestValidationErrors(errors.array());
  }
  next();
};
