import * as React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { Box, List, ListItem, ListItemText } from "@mui/material";

import { ErrorDocument } from "../../types";

type FormDialogueProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
  onItemChange: () => void;
  onDeleteItem: () => void;
  formType: string;
  id?: string;
};
type ApiRequestData = {
  id?: string;
};

export const DeleteFormDialog: React.FC<FormDialogueProps> = (props) => {
  const { open, setOpen, onItemChange, formType, id, onDeleteItem } = props;
  const [upsertItem, setUpsertItem] = React.useState(false);
  const [errors, setErrors] = React.useState<JSX.Element | null>(null);
  console.log("delete", id);

  // back end post request data
  const url = "/api/skills/destroy";
  const data = { id: id };

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
      const responseObject: { data?: boolean; errors?: ErrorDocument[] } =
        await response.json();
      // fix typing at backend deleted returns true
      if (responseObject.data) {
        // change state so that useEffect does not trigger backend call
        setUpsertItem(false);
        // close the dialogue box
        setOpen(false);
        // trigger callback to top component
        onItemChange();
        onDeleteItem();
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
    // this callback clears state which we want to do when we cancel
    onDeleteItem();
  };

  React.useEffect(() => {
    if (upsertItem) {
      setErrors(null);
      makeRequest(data, url);
      // TODO: makeBackend call
    }
  }, [upsertItem]);

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>{formType}</DialogTitle>
      <DialogContent>
        Are you sure you want to delete?
        {errors}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Yes</Button>
      </DialogActions>
    </Dialog>
  );
};
