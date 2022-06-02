import * as React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material";

type FormDialogueProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export const FormDialog: React.FC<FormDialogueProps> = (props) => {
  const { open, setOpen } = props;
  const [name, setName] = React.useState("");

  const handleSubmit = () => {};

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

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
        <TextField
          autoFocus
          margin="dense"
          id="outlined-nameOne"
          label="Name"
          value={name}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button onClick={() => setOpen(false)}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
};
