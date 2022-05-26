import React from "react";
import { AuthDbRow } from "./types";

interface AuthContext {
  isLoggedIn: boolean;
  userData?: AuthDbRow | null;
}

const AuthContext = React.createContext<AuthContext>({
  isLoggedIn: false,
  userData: null,
});

export default AuthContext;
