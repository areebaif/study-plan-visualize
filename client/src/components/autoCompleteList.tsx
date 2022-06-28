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
  value: SkillApiDocument[] | undefined;
  setValue: React.Dispatch<
    React.SetStateAction<SkillApiDocument[] | undefined>
  >;
};

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
      onChange={(event: any, newValue: SkillApiDocument[] | undefined) => {
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
