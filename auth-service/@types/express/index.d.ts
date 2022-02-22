import { MongoClient, Db } from "mongodb";
import { UserPayload } from "../../src/middlewares/currentUser";

// export interface UserPayload {
//   id: string;
//   email: string;
// }

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}
