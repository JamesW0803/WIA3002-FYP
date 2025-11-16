import { DEPARTMENTS } from "./department";
import { User, BookOpen, Calendar, Award } from "lucide-react";

const faculties = ["Faculty of Computer Science and Information Technology"];

export const studentDetailFields = [
  { type: "text", key: "username", label: "Student Name", icon: User },
  { type: "text", key: "programme_name", label: "Programme", icon: BookOpen },
  { type: "text", key: "department", label: "Department", icon: Calendar },
  { type: "text", key: "faculty", label: "Faculty", icon: Award },
  { type: "text", key: "enrollment_date", label: "Enrollment Date", icon: Calendar },
  { type: "text", key: "current_semester", label: "Current Semester", icon: BookOpen },
  { type: "text", key: "expected_graduation_year", label: "Expected Graduation Year", icon: Calendar },
  { type: "text", key: "total_credit_required", label: "Total Graduation Credits", icon: Award },
  { type: "text", key: "completed_credits", label: "Completed Credits", icon: Award },
  { type: "text", key: "progress_percentage", label: "Progress", icon: Award },
  { type: "text", key: "status", label: "Status", icon: Award },
  { type: "text", key: "cgpa", label: "CGPA", icon: Award },
];
