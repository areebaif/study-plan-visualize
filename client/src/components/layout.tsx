import * as React from "react";
// Material UI Imports
import {
  Box,
  Container,
  Grid,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
// Component Imports
import { ProgressCard } from "./cards/progressCard";
import { ItemList } from "./cards/itemListCard";
import { ItemsGridCard } from "./cards/itemsGridCard";
// Util Imports
import { products } from "../utils";
import { SkillApiDocument, SkillApiReturnData } from "../types";

export const Layout: React.FC = () => {
  const [skillItems, setSkillItems] = React.useState<SkillApiDocument[] | []>(
    []
  );
  const [skillItemsChange, setSkillItemsChange] = React.useState(false);
  const [errors, setErrors] = React.useState<JSX.Element | null>(null);
  // skill list state will be here for a user
  // to update this stae pass down a call back

  const getAllSkillRequest = async () => {
    try {
      const response = await fetch("api/skills/all", {
        method: "GET",
        credentials: "include",
      });
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("Oops, we haven't got JSON!");
      }
      const { data, errors }: SkillApiReturnData = await response.json();
      console.log("inisde backend call", data, errors);
      if (data) {
        setSkillItems(data);
        setSkillItemsChange(true);
      } else if (errors) {
        const error = (
          <List>
            {errors.map((err) => {
              return (
                <ListItem key={err.message}>
                  <ListItemText primary={err.message}></ListItemText>
                </ListItem>
              );
            })}
          </List>
        );
        setErrors(error);
        // not sure about this one have to check
        setSkillItemsChange(true);
      }
    } catch (err) {
      // TODO: error handling
      if (err instanceof Error) console.log(err);
    }
  };

  React.useEffect(() => {
    if (!skillItemsChange) {
      setErrors(null);
      getAllSkillRequest();
    }
  }, [skillItemsChange]);

  const onSkillChange = () => {
    setSkillItemsChange(false);
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 8,
      }}
    >
      <Container maxWidth={false}>
        <Grid container spacing={3}>
          <Grid item lg={12} md={12} xl={12} xs={12}>
            <ProgressCard title={"Overall Progress"} percentComplete={96} />
          </Grid>
          <Grid item lg={6} sm={6} xl={6} xs={12}>
            <ProgressCard title={"Skills Progress"} percentComplete={24.5} />
          </Grid>
          <Grid item xl={6} lg={6} sm={6} xs={12}>
            <ProgressCard title={"Resource Progress"} percentComplete={96} />
          </Grid>

          <Grid item xl={6} lg={6} sm={6} xs={12}>
            <ItemList
              items={skillItems.length ? skillItems : products}
              title={"Skills List"}
              itemType={"Skill"}
              onItemChange={onSkillChange}
            />
          </Grid>
          <Grid item xl={6} lg={6} sm={6} xs={12}>
            <ItemsGridCard skillItems={skillItems} />
          </Grid>
          <Grid item xl={6} lg={6} sm={6} xs={12}>
            <ItemList
              items={skillItems.length ? skillItems : products}
              title={"Skills List"}
              itemType={"Skill"}
              onItemChange={onSkillChange}
            />
          </Grid>
          <Grid item xl={6} lg={6} sm={12} xs={12}>
            <ItemsGridCard skillItems={skillItems} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
