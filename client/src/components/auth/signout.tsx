import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Typography, Box } from "@mui/material";
// Type imports
import { AuthApiReturnData } from "../../types";

type signoutProps = {
  logoutHandler: () => void;
};

export const Signout = (props: signoutProps) => {
  // set state
  const [errors, setErrors] = React.useState<string | null>(null);
  const authURL = "/api/users/signout";
  const navigate = useNavigate();
  const { logoutHandler } = props;

  // backend api function
  const makeRequest = async (url: string) => {
    try {
      const response = await fetch(url, {
        method: "POST",
        body: null,
      });
      if (!response.ok) throw new Error("something went wrong!!!");
      const result: AuthApiReturnData = await response.json();
      console.log("result of signout", result);
      if (response.ok) {
        // now we should redirect user
        console.log("now navigating");
        logoutHandler();
        navigate("/");
      } else {
        throw new Error("something went wrong horribly");
      }
    } catch (err) {
      // TODO: Error Handling
      if (err instanceof Error) setErrors(err.message);
    }
  };

  React.useEffect(() => {
    makeRequest(authURL);
  }, []);

  return (
    <Box>
      <Typography component="h1" variant="h5">
        {errors}
      </Typography>
      {!errors && (
        <Typography component="h1" variant="h5">
          Signing you out!!!
        </Typography>
      )}
    </Box>
  );
};
