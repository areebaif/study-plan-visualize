import * as React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Box, List, ListItem, ListItemText } from "@mui/material";

import { SkillApiReturnData } from "../types";

type FormDialogueProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
  onAddItem: () => void;
};
type ApiRequestData = {
  name: string;
};

export const FormDialog: React.FC<FormDialogueProps> = (props) => {
  const { open, setOpen, onAddItem } = props;
  const [name, setName] = React.useState("");
  const [addItemChange, setAddItemChange] = React.useState(false);
  const [errors, setErrors] = React.useState<JSX.Element | null>(null);

  // back end post request data
  const url = "/api/skills/add";
  const data = { name: name };

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
      const responseObject: SkillApiReturnData = await response.json();
      if (responseObject.data) {
        // change state so that useEffect does not trigger backend call
        setAddItemChange(false);
        // trigger callback to top component
        onAddItem();
        // close the dialogue box
        setOpen(false);
        setName("");
      } else if (responseObject.errors) {
        setAddItemChange(false);
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
      // TODO: error handling
      if (err instanceof Error) console.log(err);
    }
  };

  const handleSubmit = () => {
    // set addItemChange to true
    setAddItemChange(true);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  React.useEffect(() => {
    if (addItemChange) {
      setErrors(null);
      makeRequest(data, url);
      //setName("");
    }
  }, [addItemChange]);

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>Add Skill</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <TextField
          autoFocus
          margin="dense"
          id="outlined-name"
          label="Name"
          value={name}
          onChange={handleChange}
        />
        {errors}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setOpen(false);
            setErrors(null);
            setName("");
          }}
        >
          Cancel
        </Button>
        <Button onClick={() => handleSubmit()}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
};
