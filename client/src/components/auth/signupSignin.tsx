import * as React from "react";
import {
  Box,
  Button,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import Alert from "@mui/material/Alert";
import { SeverityPill } from "../severitypill";
import TextField from "@mui/material/TextField";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import { useNavigate } from "react-router-dom";
// Type imports
import { AuthApiReturnData, AuthDbRow } from "../../types";

export type signinSingupProps = {
  formType: string;
  loginHandler: (currentUser: AuthDbRow) => void;
};

type ApiRequestData = {
  email: string;
  password: string;
};

export const SignupSignin = (props: signinSingupProps) => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<JSX.Element | null>(null);
  const [callAuthApi, setCallAuthApi] = React.useState(false);
  const navigate = useNavigate();

  const { formType, loginHandler } = props;

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

      if (responseObject.data) {
        console.log("Iam here");
        const { data } = responseObject;
        loginHandler(data);
        navigate("/");
      } else if (responseObject.errors) {
        const error = (
          <List>
            {responseObject.errors.map((err) => {
              return (
                <ListItem key={err.message}>
                  <ListItemText primary={err.message}></ListItemText>
                </ListItem>
              );
            })}
          </List>
        );
        setErrors(error);
      }
    } catch (err) {
      // TODO: Error Handling
      if (err instanceof Error) console.log(err);
    }
  };

  React.useEffect(() => {
    setErrors(null);
    if (callAuthApi) {
      makeRequest(data, requestURL);
      setCallAuthApi(false);
    }
  }, [callAuthApi]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setCallAuthApi(true);
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
        <SeverityPill color={"error"}>{errors}</SeverityPill>
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
