import { User, BookOpen, Calendar, Award, GraduationCap, BarChart, ClipboardCheck, Building} from "lucide-react";

const faculties = ["Faculty of Computer Science and Information Technology"];

export const studentDetailFields = [
  // { type: "text", key: "username", label: "Student Name", icon: User },
  // { type: "text", key: "matric_no", label: "Matric No", icon: ClipboardCheck },
  { type: "text", key: "programme_name", label: "Programme", icon: BookOpen },
  { type: "text", key: "department", label: "Department", icon: Building }, // <- fixed
  { type: "text", key: "faculty", label: "Faculty", icon: GraduationCap },
  { type: "text", key: "intakeSession", label: "Enrollment Date", icon: Calendar },
  { type: "text", key: "currentSemester", label: "Current Semester", icon: BarChart },
  { type: "text", key: "expectedGraduation", label: "Expected Graduation Year", icon: Calendar },
  { type: "text", key: "progress", label: "Progress", icon: BarChart },
  { type: "text", key: "status", label: "Status", icon: ClipboardCheck },
  { type: "text", key: "cgpa", label: "CGPA", icon: Award },
];