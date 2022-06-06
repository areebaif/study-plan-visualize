import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Box,
  Button,
  Card,
  CardHeader,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";

import { FormDialog } from "../dialogueForm";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BookIcon from "@mui/icons-material/Book";

type Item = {
  id?: string;
  name?: string;
  imageUrl?: string;
  updatedAt?: number | Date;
};

type ItemListProps = {
  items?: Item[];
  title?: string;
  itemType?: string;
  onAddItem: () => void;
};

export const ItemList: React.FC<ItemListProps> = (props) => {
  // Props
  const { items, title, itemType, onAddItem } = props;
  // Derived From props
  const displayTitle = title || "Unknown Items";

  const [open, setOpen] = React.useState(false);
  const handleClose = () => {
    setOpen(false);
  };

  // Render
  return (
    <Card {...props}>
      <CardHeader subtitle={`${items?.length} in total`} title={displayTitle} />
      <Divider />
      {items && (
        <List>
          {items.map((item, i) => (
            <ListItem divider={i < items?.length - 1} key={item.id}>
              <ListItemAvatar>
                <BookIcon />
              </ListItemAvatar>
              <ListItemText
                primary={item.name}
                secondary={`Learned By: Test, test ,test`}
              />
              <IconButton edge="end" size="small">
                <MoreVertIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
      )}
      <Divider />
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          p: 2,
        }}
      >
        <Button
          color="primary"
          endIcon={<ArrowRightIcon />}
          size="small"
          variant="text"
          onClick={() => setOpen(true)}
        >
          Add {itemType}
        </Button>
        <FormDialog
          open={open}
          setOpen={setOpen}
          onAddItem={onAddItem}
        ></FormDialog>
      </Box>
    </Card>
  );
};
