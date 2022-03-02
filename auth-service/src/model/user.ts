import { ObjectId, WithId, DeleteResult } from "mongodb";

import { connectDb } from "../services/mongodb";
// TODO: convert them into one import
import { logErrorMessage } from "../errors/customError";
import { DatabaseErrors } from "../errors/databaseErrors";

interface UserDocument {
  _id: ObjectId;
  email: string;
  password: string;
}
interface ReturnUserProps {
  _id?: ObjectId;
  email?: string;
  password?: string;
}
type showPasswordField = {
  password: boolean;
};

export class User {
  static collectionName = "users";

  static async insertUser(userProps: UserDocument) {
    try {
      const { email } = userProps;
      const db = await connectDb();
      const insertUser = await db
        .collection(User.collectionName)
        .insertOne(userProps);
      const userCreated = await User.userByEmail(email);
      return userCreated;
    } catch (err) {
      logErrorMessage(err);
      throw new DatabaseErrors(
        "Unable to create user in database either email in use or database operation failed"
      );
    }
  }

  static async deleteUser(id: ObjectId) {
    try {
      const db = await connectDb();
      const result: DeleteResult = await db
        .collection(User.collectionName)
        .deleteOne({ id });
      return result.acknowledged;
    } catch (err) {
      logErrorMessage(err);
      throw new DatabaseErrors("Unable to delete user in the databse");
    }
  }

  static async userByEmail(email: string, options?: showPasswordField) {
    try {
      const db = await connectDb();
      const result: WithId<ReturnUserProps>[] = await db
        .collection(User.collectionName)
        // you only want to return user password in case you are doing a password check
        .find({ email }, { projection: options })
        .toArray();
      if (!result)
        throw new DatabaseErrors("Unable to retrieve user from database");
      return result;
    } catch (err) {
      logErrorMessage(err);
      throw new DatabaseErrors("Unable to retrieve user from database");
    }
  }
  static normalizeUserProps(userAttrs: ReturnUserProps): {
    email: string;
    id: string;
  } {
    // we are using this function to provide consistent response between different microservices
    const modifiedId = { id: userAttrs._id };
    // add Id field to the userAttrs
    const modifiedUser = Object.assign(modifiedId, userAttrs);
    // remove _id field and password from the userAttrs
    const transformedUser = JSON.stringify(modifiedUser, function (key, value) {
      if (key === "password" || key === "_id") return undefined;
      else {
        return value;
      }
    });
    // return JSON object
    return JSON.parse(transformedUser);
  }
}
