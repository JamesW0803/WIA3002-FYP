import { DEPARTMENTS } from "./department";
import { COURSE_TYPES, READABLE_COURSE_TYPES } from "./courseType";

const faculties = ["Faculty of Computer Science and Information Technology"];
const studyLevels = [0, 1, 2, 3];
const credit_hours = [2, 3, 4, 5, 13];
const semesters = ["Semester 1", "Semester 2", "Semester 1 & 2", "Special Semester", "ALL"];

export const formSessions = [
    {
        title: "Basic Information",
        fields: [
            { type: "text", key: "course_code", label: "Course Code" },
            { type: "text", key: "course_name", label: "Course Name" },
            {
            type: "select",
            key: "credit_hours",
            label: "Credit Hours",
            options: credit_hours.map((ch) => ({ label: ch, value: ch })),
            },
            { type: "text", key: "description", label: "Description" },
        ],
    },
    {
        title: "Classification",
        fields: [
        {
            type: "select",
            key: "faculty",
            label: "Faculty",
            options: faculties.map((item) => ({ label: item, value: item })),
        },
        {
            type: "select",
            key: "department",
            label: "Department",
            options: DEPARTMENTS.map((item) => ({ label: item, value: item })),
        },
        {
            type: "select",
            key: "type",
            label: "Type",
            options: COURSE_TYPES.map((item) => ({
                label: READABLE_COURSE_TYPES[item],
                value: item,
            })),
        },
        {
            type: "select",
            key: "study_level",
            label: "Study Level",
            options: studyLevels.map((item) => ({ label: item, value: item })),
        },
        {
            type: "select",
            key: "offered_semester",
            label: "Offered In",
            options: semesters.map((item) => ({ label: item, value: item })),
        },
        ],
    },
    {
        title: "Basic Information",
        fields: [
            {
                type: "select",
                key: "prerequisites",
                label: "Prerequisites",
                options: [],
            },
        ],
    },
];

export const allCourseFields = formSessions.flatMap(session => session.fields);

