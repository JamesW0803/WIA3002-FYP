import {
  Hash,
  BookOpen,
  Calendar,
  Users,
  Percent,
  Clock,
  Building,
  FileText,
} from "lucide-react";
import { DEPARTMENTS } from "./department";

const faculties = ["Faculty of Computer Science and Information Technology"];

export const programmeIntakeFormFields = [
  {
    type: "text",
    key: "programme_intake_code",
    label: "Programme Enrollment Code",
    icon: Hash,
    readonly: true, // auto-generated
    placeholder: "Auto-generated based on programme & session",
  },
  {
    type: "select",
    key: "programme_name",
    label: "Programme Name",
    icon: BookOpen,
    options: [], // fill dynamically
    placeholder: "Select programme",
  },
  {
    type: "select",
    key: "academic_session_id",
    label: "Intake Session",
    icon: Calendar,
    options: [], // fill dynamically
    placeholder: "Select intake session",
  },
//   {
//     type: "select",
//     key: "semester",
//     label: "Enrollment Semester",
//     icon: Calendar,
//     options: [],
//     placeholder: "Select semester",
//   },
  {
    type: "select",
    key: "department",
    label: "Department",
    icon: Building,
    options: DEPARTMENTS.map((department) => ({ label: department, value: department })),
    placeholder: "Select department",
  },
  {
    type: "select",
    key: "faculty",
    label: "Faculty",
    icon: Building,
    options: faculties.map((faculty) => ({ label: faculty, value: faculty })),
    placeholder: "Select faculty",
  },
  {
    type: "select",
    key: "min_semester",
    label: "Duration (Minimum Semesters)",
    icon: Clock,
    options: [6,7,8].map((num) => ({ label: num, value: num })),
    placeholder: "Select Minimum Semester ",
  },
  {
    type: "select",
    key: "max_semester",
    label: "Duration (Maximum Semesters)",
    icon: Clock,
    options: [10,11,12].map((num) => ({ label: num, value: num })),
    placeholder: "Select Maximum Semester ",
  },
  {
    type: "text",
    key: "number_of_students_enrolled",
    label: "Number of Students Enrolled",
    icon: Users,
    readonly: true, // cannot modify
  },
  {
    type: "text",
    key: "graduation_rate",
    label: "Graduation Rate",
    icon: Percent,
    readonly: true, // cannot modify
  },
  {
    type: "text",
    key: "createdAt",
    label: "Created at",
    icon: FileText,
    readonly: true,
  },
  {
    type: "text",
    key: "updatedAt",
    label: "Updated at",
    icon: FileText,
    readonly: true,
  },
];
