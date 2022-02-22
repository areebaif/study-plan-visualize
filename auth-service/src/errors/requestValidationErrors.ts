import { ValidationError } from "express-validator";
import { ErrorStructureInstance } from "../middlewares/errorHandler";
import { CustomError } from "./customError";

export class RequestValidationErrors extends CustomError {
  statusCode: number;
  constructor(public errors: ValidationError[]) {
    super("invalid request parameters");
    this.statusCode = 400;
    Object.setPrototypeOf(this, RequestValidationErrors.prototype);
  }

  serializeErrors(): ErrorStructureInstance[] {
    return this.errors.map((err) => {
      return { message: err.msg, field: err.param };
    });
  }
}
