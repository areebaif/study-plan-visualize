import * as React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { SkillApiDocument, SkillApiReturnData } from "../types";

type AutoCompleteListProps = {
  skillItems: SkillApiDocument[] | [];
};
interface SkillOptions {
  _id: string;
  userId: string;
  name: string;
  version: number;
  resourceId: string[] | undefined;
}
export const AutoCompleteList = (props: AutoCompleteListProps) => {
  const { skillItems } = props;
  // These are all the multiple values selected by the user.
  const [value, setValue] = React.useState<SkillOptions[] | undefined>(
    undefined
  );
  return (
    <Autocomplete
      value={value}
      onChange={(event: any, newValue: SkillOptions[] | undefined) => {
        setValue(newValue);
      }}
      multiple
      id="size-small-standard-multi"
      size="small"
      options={skillItems}
      getOptionLabel={(option) => option?.name}
      renderInput={(params) => (
        <TextField {...params} variant="standard" label="skills" />
      )}
    />
  );
};
