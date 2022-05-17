import { MongoClient, Db } from "mongodb";
import keys from "../config/keys";
import { logErrorMessage } from "../errors/customError";
import { DatabaseErrors } from "../errors/databaseErrors";

export let db: Db;
export let client: MongoClient;
const environmentVariable = keys.DATABASE;
if (!environmentVariable) throw new Error("environemnt variable undefined");
export const URI = environmentVariable!!;

export const mongoDBClient = async (URIString: string) => {
  try {
    const client = await MongoClient.connect(URIString);
    console.log("connected to MongoClient");
    return client;
  } catch (err) {
    return Promise.reject("Cannot connect to mongdb client");
  }
};

export const connectDb = async (uri: string = URI) => {
  try {
    if (db) return db;
    client = await mongoDBClient(uri);
    db = client.db();
    console.log("connected to mongo database");
    return db;
  } catch (err) {
    logErrorMessage(err);
    console.log("ERROR, COULD NOT CONNECT TO MONGODB!");
    throw new DatabaseErrors("could not connect to db");
  }
};
