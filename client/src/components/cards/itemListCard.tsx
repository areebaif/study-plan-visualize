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
  Menu,
  MenuItem,
} from "@mui/material";

import { FormDialog } from "../dialogueForm";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import BookIcon from "@mui/icons-material/Book";
import CreateIcon from "@mui/icons-material/Create";
import { skillActiveStatus } from "../../types";

type Item = {
  id?: string; // dummy data
  imageUrl?: string; // dummy data
  updatedAt?: number | Date; // dummy data
  _id?: string;
  userId?: string;
  name?: string;
  version?: number;
  resourceId?: string[] | undefined;
  dbStatus?: skillActiveStatus;
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
  const [open, setOpen] = React.useState(false);
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  const IconButtonOpen = Boolean(anchorElUser);
  // props used to edit a skill Item
  const [editName, setEditName] = React.useState<undefined | string>(undefined);
  const [editId, setEditId] = React.useState<undefined | string>(undefined);
  const [editOpen, setEditOpen] = React.useState(false);
  // Derived From props
  const displayTitle = title || "Unknown Items";

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    console.log("Clicked!");
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    console.log("state reset!");
    setAnchorElUser(null);
  };
  const settings = ["Edit", "Delete"];

  // Render
  return (
    <Card {...props}>
      <CardHeader subtitle={`${items?.length} in total`} title={displayTitle} />
      <Divider />
      {items && (
        <List>
          {items.map((item, i) => {
            return (
              <ListItem divider={i < items?.length - 1} key={item._id}>
                <ListItemAvatar>
                  <BookIcon />
                </ListItemAvatar>
                <ListItemText
                  primary={item.name}
                  secondary={`Learned By: Test, test ,test`}
                />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    p: 2,
                  }}
                >
                  <IconButton
                    onClick={() => {
                      setEditName(item.name);
                      setEditId(item._id);
                      setEditOpen(true);
                    }}
                    edge="end"
                    size="small"
                  >
                    <CreateIcon />
                  </IconButton>
                  <IconButton edge="end" size="small" href={"/test"}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </ListItem>
            );
          })}
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
          formType={"Add Skill"}
          editName={editName}
          _id={editId}
        ></FormDialog>
        <FormDialog
          open={editOpen}
          setOpen={setEditOpen}
          onAddItem={onAddItem}
          formType={"Edit Skill"}
          editName={editName}
          _id={editId}
        ></FormDialog>
      </Box>
    </Card>
  );
};
