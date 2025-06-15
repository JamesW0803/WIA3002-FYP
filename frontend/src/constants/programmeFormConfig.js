import { DEPARTMENTS } from "./department";

const faculties = ["Faculty of Computer Science and Information Technology"];

export const programmeFormFields = [
    { type: "text", key: "programme_code", label: "Programme Code" },
    { type: "text", key: "programme_name", label: "Programme Name" },
    { type: "text", key: "description", label: "Description" },

    {
        type: "select",
        key: "department",
        label: "Department",
        options: DEPARTMENTS.map((department) => ({ label: department, value: department })),
    },
    {
        type: "select",
        key: "faculty",
        label: "Faculty",
        options: faculties.map((faculty) => ({ label: faculty, value: faculty })),
    },
];

