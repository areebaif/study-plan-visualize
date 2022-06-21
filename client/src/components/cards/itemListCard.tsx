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

import { UpsertFormDialog } from "../dialogForms/upsertDialog";
import { DeleteFormDialog } from "../dialogForms/deleteDialog";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import BookIcon from "@mui/icons-material/Book";
import CreateIcon from "@mui/icons-material/Create";
import { skillActiveStatus, ResourceApiDocument } from "../../types";

type Item = {
  id?: string; // dummy data
  imageUrl?: string; // dummy data
  updatedAt?: number | Date; // dummy data
  _id?: string;
  userId?: string;
  name?: string;
  version?: number;
  resourceId?: ResourceApiDocument[] | undefined;
  dbStatus?: skillActiveStatus;
};

type ItemListProps = {
  items?: Item[];
  title?: string;
  itemType?: string;
  onItemChange: () => void;
};

export const ItemList: React.FC<ItemListProps> = (props) => {
  // Props
  const { items, title, itemType, onItemChange } = props;
  const [open, setOpen] = React.useState(false);
  // props to edit a skill Item
  const [editName, setEditName] = React.useState<undefined | string>(undefined);
  const [itemId, setItemId] = React.useState<undefined | string>(undefined);
  const [editOpen, setEditOpen] = React.useState(false);
  // // props to delete a skill Item
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Derived From props
  const displayTitle = title || "Unknown Items";

  const handleClose = () => {
    setOpen(false);
  };

  const onEditItem = () => {
    setEditName(undefined);
    setItemId(undefined);
  };

  const onDeleteItem = () => {
    setItemId(undefined);
  };

  // Render
  return (
    <Card {...props}>
      <CardHeader subtitle={`${items?.length} in total`} title={displayTitle} />
      <Divider />
      {items && (
        <List style={{ maxHeight: "400px", overflow: "auto" }}>
          {items.map((item, i) => {
            return (
              <ListItem divider={i < items?.length - 1} key={item._id}>
                <ListItemAvatar>
                  <BookIcon />
                </ListItemAvatar>
                <ListItemText
                  primary={item.name}
                  secondary={`Learned by: ${item.resourceId?.map(
                    (element) => ` ${element.name}`
                  )}`}
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
                      setItemId(item._id);
                      setEditOpen(true);
                    }}
                    edge="end"
                    size="small"
                  >
                    <CreateIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      setItemId(item._id);
                      setDeleteOpen(true);
                    }}
                    edge="end"
                    size="small"
                  >
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
          p: 3,
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
        {open && (
          <UpsertFormDialog
            open={open}
            setOpen={setOpen}
            onItemChange={onItemChange}
            formType={"Add Skill"}
          ></UpsertFormDialog>
        )}
        {editOpen && (
          <UpsertFormDialog
            open={editOpen}
            setOpen={setEditOpen}
            onItemChange={onItemChange}
            formType={"Edit Skill"}
            editName={editName}
            id={itemId}
            onEditItem={onEditItem}
          ></UpsertFormDialog>
        )}
        {deleteOpen && (
          <DeleteFormDialog
            open={deleteOpen}
            setOpen={setDeleteOpen}
            onItemChange={onItemChange}
            formType={"Delete Skill"}
            onDeleteItem={onDeleteItem}
            id={itemId}
          ></DeleteFormDialog>
        )}
      </Box>
    </Card>
  );
};
