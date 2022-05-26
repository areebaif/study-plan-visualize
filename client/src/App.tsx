import * as React from "react";
import { Routes, Route } from "react-router-dom";
// MUI Imports
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { theme } from "./themes";
// Component Imports
import AuthContext from "./auth-context";
import { Header } from "./components/header";
import { Layout } from "./components/layout";
import { AuthApiReturnData, AuthDbRow } from "./types";
import { SignupSignin } from "./components/signupSignin";

function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userData, setUserData] = React.useState<null | AuthDbRow>(null);
  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/users/currentuser", {
        method: "GET",
        credentials: "include",
      });
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("Oops, we haven't got JSON!");
      }
      const { currentUser }: AuthApiReturnData = await response.json();
      console.log(currentUser);
      if (currentUser) {
        setUserData(currentUser);
        setIsLoggedIn(false);
      } else {
        setIsLoggedIn(false);
      }
    } catch (err) {
      // log error for debugging purposes
      if (err instanceof Error) console.log(err);
    }
  };
  const logOutHandler = () => {
    setIsLoggedIn(false);
  };

  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthContext.Provider
        value={{ isLoggedIn: isLoggedIn, userData: userData }}
      >
        <React.Fragment>
          <Header />
          <Routes>
            <Route path="/" element={<Layout />} />
            <Route
              path="/users/signup"
              element={<SignupSignin formType={"signup"} />}
            />
            <Route
              path="/users/signin"
              element={<SignupSignin formType={"signin"} />}
            />
          </Routes>
        </React.Fragment>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

export default App;
