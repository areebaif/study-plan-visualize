import { devKeys } from "./dev";
import prodKeys from "./prod";

const keys: {
  DATABASE?: string;
  JWT_KEY?: string;
  NODE_ENV?: string;
  PORT?: string;
} = process.env.NODE_ENV === "development" ? devKeys : prodKeys;

export default keys;
