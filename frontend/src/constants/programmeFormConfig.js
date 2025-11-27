import { DEPARTMENTS } from "./department";
import { Book, FileText, Building, Users, Tag } from "lucide-react";

const faculties = ["Faculty of Computer Science and Information Technology"];

export const programmeFormFields = [
  {
    type: "text",
    key: "programme_code",
    label: "Programme Code",
    icon: Tag,
    placeholder: "e.g., BCS101",
    readonly: true,
  },
  {
    type: "text",
    key: "programme_name",
    label: "Programme Name",
    icon: Book,
    placeholder: "e.g., Bachelor of Computer Science",
  },
  {
    type: "text",
    key: "description",
    label: "Description",
    icon: FileText,
    multiline: true,
    placeholder: "Enter programme description...",
  },
  {
    type: "select",
    key: "department",
    label: "Department",
    icon: Building,
    options: DEPARTMENTS.map((department) => ({ label: department, value: department })),
  },
  {
    type: "select",
    key: "faculty",
    label: "Faculty",
    icon: Users,
    options: faculties.map((faculty) => ({ label: faculty, value: faculty })),
  },
];
