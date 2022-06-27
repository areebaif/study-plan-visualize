import * as React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import {
  SkillApiDocument,
  SkillApiReturnData,
  ResourceApiDocument,
} from "../types";

type AutoCompleteListProps = {
  skillItems: SkillApiDocument[] | [];
  value: SkillOptions[] | undefined;
  setValue: React.Dispatch<React.SetStateAction<SkillOptions[] | undefined>>;
};
interface SkillOptions {
  _id: string;
  userId: string;
  name: string;
  version: number;
  resourceId: ResourceApiDocument[] | undefined;
}
export const AutoCompleteList = (props: AutoCompleteListProps) => {
  const { skillItems, value, setValue } = props;
  // These are all the multiple values selected by the user.
  // const [value, setValue] = React.useState<SkillOptions[] | undefined>(
  //   undefined
  // );
  return (
    <Autocomplete
      sx={{ width: 1 }}
      value={value}
      onChange={(event: any, newValue: SkillOptions[] | undefined) => {
        setValue(newValue);
      }}
      multiple
      id="size-small-standard-multi"
      size="medium"
      options={skillItems}
      getOptionLabel={(option) => option?.name}
      renderInput={(params) => (
        <TextField {...params} variant="standard" label="Skills" />
      )}
    />
  );
};
