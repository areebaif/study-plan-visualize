import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export class PasswordManager {
  static async toHash(password: string) {
    // randomBytes retrun a buffer you turn it to string
    const salt = randomBytes(8).toString("hex");
    // you hash the password or encrypt the password with scrypt
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${buf.toString("hex")}.${salt}`;
  }
  static async compare(storedPassword: string, suppliedPassword: string) {
    const [encryptedPassword, salt] = storedPassword.split(".");
    // encrypt the password user supplied and compare with stored encrypt password
    const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;

    return buf.toString("hex") === encryptedPassword;
  }
}
