import * as React from "react";
import {
  Box,
  Container,
  Grid,
  Button,
  Card,
  CardContent,
  Typography,
  Avatar,
} from "@mui/material";
import TextField from "@mui/material/TextField";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import { Navigate } from "react-router-dom";
// Type imports
import { AuthApiReturnData } from "../types";

export interface signinSingupProps {
  formType: string;
}

type ApiRequestData = {
  email: string;
  password: string;
};

export const SignupSignin = (props: signinSingupProps) => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [shouldRedirect, setShouldRedirect] = React.useState(false);

  const { formType } = props;

  // data for make request function
  const requestURL =
    formType === "signup" ? "/api/users/signup" : "/api/users/signin";
  const data = { email: email, password: password };

  const makeRequest = async (data: ApiRequestData, url: string) => {
    try {
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("Oops, we haven't got JSON!");
      }

      const responseObject: AuthApiReturnData = await response.json();
      if (!responseObject.errors) {
        // let the parent component know that user loggedIn now
        setShouldRedirect(true);
      } else {
        // TODO: Error Handling
      }
    } catch (err) {
      // TODO: Do Error Handling
      if (err instanceof Error) console.log(err);
    }
  };

  React.useEffect(() => {
    // before making api calls cleanup for any errors before
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log(email, password);
  };
  return (
    <Box
      sx={{
        marginTop: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        bgcolor: "white",
      }}
    >
      <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
        <LockOutlinedIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        {formType}
      </Typography>
      <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          label="Email Address"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          type="password"
          id="outlined-password-input"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          {formType}
        </Button>
      </Box>
    </Box>
  );
};

//   return (
//     <div>
//       {shouldRedirect && <Navigate to="/" />}
//       <form onSubmit={onSubmit} className="container">
//         <h1>{formType}</h1>
//         <div className="form-group">
//           <label>Email Address</label>
//           <input
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="form-control"
//           ></input>
//         </div>
//         <div className="form-group">
//           <label>Password</label>
//           <input
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             type="password"
//             className="form-control"
//           ></input>
//         </div>
//         <button className="btn btn-primary">{formType}</button>
//       </form>
//     </div>
//   );
// };
