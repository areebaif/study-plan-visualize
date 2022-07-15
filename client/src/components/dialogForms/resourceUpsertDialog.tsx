// https://mui.com/material-ui/react-autocomplete/ multiple values, controllable inputs

import * as React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { List, ListItem, ListItemText, Divider } from "@mui/material";

import { SkillApiReturnData, SkillApiDocument } from "../../types";
import { AutoCompleteList } from "../autoCompleteList";

type FormDialogueProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
  onItemChange: () => void;
  onSkillChange: () => void;
  formType: string;
  // The below value is used to populate a list of all skills to add to any resource
  allSkillItem: [] | SkillApiDocument[];
  editName?: string;
  editType?: string;
  editLearningStatus?: number;
  // This option populates already any skill values attached to the resource
  editSkillId?: [] | SkillApiDocument[];
  id?: string;
  onEditItem?: () => void;
};
type ApiRequestData = {
  name?: string;
  id?: string;
};

export const UpsertFormDialog: React.FC<FormDialogueProps> = (props) => {
  const {
    open,
    setOpen,
    onItemChange,
    onSkillChange,
    formType,
    allSkillItem,
    editName,
    editType,
    editLearningStatus,
    editSkillId,
    id,
    onEditItem,
  } = props;
  const [name, setName] = React.useState<string | undefined>(
    editName ? editName : ""
  );
  const [progressError, setProgressError] = React.useState(false);
  const [type, setType] = React.useState<string | undefined>(
    editType ? editType : ""
  );
  const [learningStatus, setLearningStatus] = React.useState<
    number | undefined
  >(editLearningStatus ? editLearningStatus : undefined);

  const [autoCompleteListValue, setAutoCompleteListValue] = React.useState<
    SkillApiDocument[] | undefined
  >(editSkillId?.length ? editSkillId : []);
  const [upsertItem, setUpsertItem] = React.useState(false);
  const [errors, setErrors] = React.useState<JSX.Element | null>(null);

  // back end post request data
  const url =
    formType === "Add Resource" ? "/api/resource/add" : "/api/resource/update";
  const addData = {
    name: name,
    type: type,
    learningStatus: learningStatus,
    skillId: autoCompleteListValue,
  };
  const editData = {
    name: name,
    id: id,
    type: type,
    learningStatus: learningStatus,
    skillId: autoCompleteListValue,
  };

  const makeRequest = async (data: ApiRequestData, url: string) => {
    try {
      console.log("data to be sent to backend", data);
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
        onSkillChange();
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
    setType("");
    setLearningStatus(undefined);
    // this callback clears state which we want to do when we cancel
    onEditItem?.();
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setType(event.target.value);
  };

  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(event.target.value);
    if (isNaN(num)) {
      setProgressError(true);
      setLearningStatus(undefined);
    } else {
      setProgressError(false);
      setLearningStatus(num);
    }
  };

  React.useEffect(() => {
    if (upsertItem) {
      setErrors(null);
      formType === "Add Resource"
        ? makeRequest(addData, url)
        : makeRequest(editData, url);
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
          onChange={handleNameChange}
        />
        <TextField
          autoFocus
          margin="dense"
          id="outlined-type"
          label="Type"
          value={type}
          onChange={handleTypeChange}
        />
        <TextField
          autoFocus
          margin="dense"
          id="outlined-Progress"
          label="Progress"
          error={progressError}
          helperText="Use value between 0 and 100"
          value={learningStatus}
          onChange={handleProgressChange}
        />
        <Divider sx={{ margin: 0.5 }} />
        <AutoCompleteList
          skillItems={allSkillItem}
          value={autoCompleteListValue}
          setValue={setAutoCompleteListValue}
        ></AutoCompleteList>
        <Divider />
        {errors}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
};
