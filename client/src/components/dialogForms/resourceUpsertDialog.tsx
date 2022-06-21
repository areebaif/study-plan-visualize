// https://mui.com/material-ui/react-autocomplete/ multiple values, controllable inputs

import * as React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Box, List, ListItem, ListItemText } from "@mui/material";

import { SkillApiReturnData } from "../../types";

type FormDialogueProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
  onItemChange: () => void;
  formType: string;
  editName?: string;
  id?: string;
  onEditItem?: () => void;
};
type ApiRequestData = {
  name?: string;
  id?: string;
};

export const UpsertFormDialog: React.FC<FormDialogueProps> = (props) => {
  const { open, setOpen, onItemChange, formType, editName, id, onEditItem } =
    props;
  const [name, setName] = React.useState<string | undefined>(
    editName ? editName : ""
  );
  const [upsertItem, setUpsertItem] = React.useState(false);
  const [errors, setErrors] = React.useState<JSX.Element | null>(null);

  // back end post request data
  const url =
    formType === "Add Skill" ? "/api/skills/add" : "/api/skills/update";
  const addSkillData = { name: name };
  const editSkillData = { name: name, id: id };

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
        setUpsertItem(false);
        // close the dialogue box
        setOpen(false);
        setName("");
        // trigger callback to top component
        onItemChange();
        onEditItem?.();
      } else if (responseObject.errors) {
        setUpsertItem(false);
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
    // set upsertItem to true
    setUpsertItem(true);
  };

  const handleCancel = () => {
    setOpen(false);
    setErrors(null);
    setName("");
    // this callback clears state which we want to do when we cancel
    onEditItem?.();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  React.useEffect(() => {
    if (upsertItem) {
      setErrors(null);

      formType === "Add Skill"
        ? makeRequest(addSkillData, url)
        : makeRequest(editSkillData, url);
    }
  }, [upsertItem]);

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>{formType}</DialogTitle>
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
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
};
