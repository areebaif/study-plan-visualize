import * as React from "react";

import { format } from "date-fns";
import { v4 as uuid } from "uuid";
import {
  Box,
  Button,
  Card,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import { SeverityPill } from "../severitypill";

import { SkillApiDocument, ErrorDocument } from "../../types";
const orders = [
  {
    id: uuid(),
    ref: "CDD1049",
    learningStatus: 30.5,
    name: "Javascript Fundamentals",
    createdAt: 1555016400000,
    learnedBy: [
      { skill: "Skill 1" },
      { skill: "Skill2" },
      { skill: "Skill 3" },
    ],
    status: "pending",
  },
  {
    id: uuid(),
    ref: "CDD1048",
    learningStatus: 25.1,
    name: "Java for Dummies",
    createdAt: 1555016400000,
    learnedBy: [
      { skill: "Skill 1" },
      { skill: "Skill2" },
      { skill: "Skill 3" },
    ],
    status: "delivered",
  },
  {
    id: uuid(),
    ref: "CDD1047",
    learningStatus: 10.99,
    name: "Multiplatform",
    createdAt: 1554930000000,
    learnedBy: [
      { skill: "Skill 1" },
      { skill: "Skill2" },
      { skill: "Skill 3" },
    ],
    status: "refunded",
  },
  {
    id: uuid(),
    ref: "CDD1046",
    learningStatus: 96.43,
    name: "Dynamic Programming",
    createdAt: 1554757200000,
    learnedBy: [
      { skill: "Skill 1" },
      { skill: "Skill2" },
      { skill: "Skill 3" },
    ],
    status: "pending",
  },
  {
    id: uuid(),
    ref: "CDD1045",
    learningStatus: 32.54,
    name: "Clarke Gillebert",
    createdAt: 1554670800000,
    learnedBy: [
      { skill: "Book One" },
      { skill: "Book Two" },
      { skill: "Course 3" },
    ],
    status: "delivered",
  },
  {
    id: uuid(),
    ref: "CDD1044",
    learningStatus: 16.76,
    name: "Adam Denisov",
    createdAt: 1554670800000,
    learnedBy: [
      { skill: "Book One" },
      { skill: "Book Two" },
      { skill: "Course 3" },
    ],
    status: "delivered",
  },
];

interface ResourceDocument {
  data: {
    id: string;
    userId: string;
    name: string;
    type: string;
    learningStatus: number;
    skillId: string[];
  }[];
  errors: ErrorDocument[];
}

interface MappedResources {
  id: string;
  userId: string;
  name: string;
  type: string;
  learningStatus: number;
  skills: { skillId: string; skillName: string }[];
}
[];
type ItemsGridCardProps = {
  skillItems: SkillApiDocument[] | [];
};

export const ItemsGridCard = (props: ItemsGridCardProps) => {
  // keep the state of popup component here in case we have to edit so we need to prepopulate list
  const { skillItems } = props;
  const [errors, setErrors] = React.useState<JSX.Element | null>(null);
  const [resourceItems, setResourceItems] = React.useState<
    ResourceDocument["data"] | []
  >([]);
  const [resourceItemsChange, setResourceItemsChange] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  // props to edit a resource Item
  // Note: These are all independant states hence we are using UseState not UseReducer.
  // Validation logic of all these states is at backend, Hence, We are not doing validation on front-end, thus no need for useReducer
  const [editName, setEditName] = React.useState("");
  const [editId, setEditId] = React.useState("");
  const [editType, setEditType] = React.useState("");
  const [editLearningStatus, setEditLearningStatus] = React.useState<
    number | undefined
  >(undefined);
  const [editSkillId, setEditSkillId] = React.useState<string[] | []>([]);

  const getAllResourceRequest = async () => {
    try {
      const response = await fetch("/api/resource/all", {
        method: "GET",
        credentials: "include",
      });
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("Oops, we haven't got JSON!");
      }
      const { data, errors }: ResourceDocument = await response.json();
      console.log("inisde resource backend call", data, errors);
      if (data) {
        setResourceItems(data);
        setResourceItemsChange(true);
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
        setResourceItemsChange(true);
      }
    } catch (err) {
      // TODO: error handling
      if (err instanceof Error) console.log(err);
    }
  };

  return (
    <Card>
      <CardHeader title="Resource List" />
      <Box sx={{ minWidth: 800, overflow: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Resource Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Teaches</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Update</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((item) => (
              <TableRow hover key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell></TableCell>
                <TableCell>{`${item.learnedBy.map(
                  (element) => element.skill
                )}`}</TableCell>
                <TableCell>
                  <LinearProgress
                    value={item.learningStatus}
                    variant="determinate"
                  />
                </TableCell>
                <TableCell>
                  <SeverityPill
                    color={
                      (item.status === "delivered" && "success") ||
                      (item.status === "refunded" && "error") ||
                      "warning"
                    }
                  >
                    {item.status}
                  </SeverityPill>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          p: 3,
        }}
      >
        <Button
          color="primary"
          endIcon={<ArrowRightIcon fontSize="small" />}
          size="small"
          variant="text"
          onClick={() => setOpen(true)}
        >
          Add Resource
        </Button>
      </Box>
    </Card>
  );
};
