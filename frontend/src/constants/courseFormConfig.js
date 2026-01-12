import { DEPARTMENTS } from "./department";
import { COURSE_TYPES, READABLE_COURSE_TYPES } from "./courseType";
import { 
  validateCourseCode, 
  validateCourseName,
  validateCreditHours,
  validateCourseType,
} from "../utils/validators";

import {
  Book,
  FileText,
  Award,
  Building,
  Users,
  Layers,
  Calendar,
  Tag,
  Bookmark,
} from "lucide-react";

const faculties = ["Faculty of Computer Science and Information Technology"];

const studyLevels = [0, 1, 2, 3];

const credit_hours = [2, 3, 4, 5, 12, 14];

const semesters = [
  "Semester 1",
  "Semester 2",
  "Semester 1 & 2",
  "Special Semester",
  "ALL",
];

export const formSessions = [
  {
    title: "Basic Information",
    fields: [
      {
        type: "text",
        key: "course_code",
        label: "Course Code",
        icon: Tag,
        placeholder: "e.g., WIA1001",
        readonly: true,
        validator: validateCourseCode, 

      },
      {
        type: "text",
        key: "course_name",
        label: "Course Name",
        icon: Book,
        placeholder: "e.g., Data Structures",
        validator: validateCourseName,
      },
      {
        type: "select",
        key: "credit_hours",
        label: "Credit Hours",
        icon: Award,
        options: credit_hours.map((ch) => ({ label: ch, value: ch })),
        validator: validateCreditHours,
      },
      {
        type: "text",
        key: "description",
        label: "Description",
        icon: FileText,
        multiline: true,
        placeholder: "Enter course description...",
      },
    ],
  },

  {
    title: "Classification",
    fields: [
      {
        type: "select",
        key: "faculty",
        label: "Faculty",
        icon: Users,
        options: faculties.map((item) => ({ label: item, value: item })),
      },
      {
        type: "select",
        key: "department",
        label: "Department",
        icon: Building,
        options: DEPARTMENTS.map((item) => ({ label: item, value: item })),
      },
      {
        type: "select",
        key: "type",
        label: "Type",
        icon: Layers,
        options: COURSE_TYPES.map((item) => ({
          label: READABLE_COURSE_TYPES[item],
          value: item,
        })),
        validator: validateCourseType,
      },
      {
        type: "select",
        key: "study_level",
        label: "Study Level",
        icon: Bookmark,
        options: studyLevels.map((item) => ({ label: item, value: item })),
      },
      {
        type: "select",
        key: "offered_semester",
        label: "Offered In",
        icon: Calendar,
        options: semesters.map((item) => ({ label: item, value: item })),
      },
    ],
  },

  {
    title: "Prerequisites",
    fields: [
      {
        type: "select",
        key: "prerequisites",
        label: "Prerequisites",
        icon: Book,
        options: [], // fill dynamically from courses list
        placeholder: "Choose prerequisite course",
      },
    ],
  },
];

export const allCourseFields = formSessions.flatMap(
  (session) => session.fields
);
