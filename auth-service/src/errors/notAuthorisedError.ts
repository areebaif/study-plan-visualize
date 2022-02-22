import { ErrorStructureInstance } from "../middlewares/errorHandler";
import { CustomError } from "./customError";

export class NotAuthorizedError extends CustomError {
  statusCode: number;
  constructor() {
    super("not authorized");
    this.statusCode = 401;
    Object.setPrototypeOf(this, NotAuthorizedError.prototype);
  }
  serializeErrors(): ErrorStructureInstance[] {
    return [{ message: "not authorized" }];
  }
}
