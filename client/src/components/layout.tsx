import * as React from "react";
// Material UI Imports
import { Box, Container, Grid } from "@mui/material";
// Component Imports
import { ProgressCard } from "./cards/progressCard";
import { ItemList } from "./cards/itemListCard";
import { ItemsGridCard } from "./cards/itemsGridCard";
// Util Imports
import { products } from "../utils";
import { SkillApiDocument } from "../types";

export const Layout: React.FC = () => {
  const [skillItems, setSkillItems] = React.useState<SkillApiDocument[] | null>(
    null
  );
  const [skillItemsChange, setSkillItemsChange] = React.useState(false);
  // skill list state will be here for a user
  // to update this stae pass down a call back
  React.useEffect(() => {
    if (!skillItemsChange) {
      // TODO: call backend api to fetch all skills
    }
  }, [skillItemsChange]);

  const onAddItem = () => {
    setSkillItemsChange(true);
  };

  console.log("hello");
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
              items={skillItems ? skillItems : products}
              title={"Skills List"}
              itemType={"Skill"}
              onAddItem={onAddItem}
            />
          </Grid>
          <Grid item xl={6} lg={6} sm={6} xs={12}>
            <ItemsGridCard />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
