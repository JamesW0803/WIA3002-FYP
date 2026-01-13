import { useState, useEffect } from "react";
import { READABLE_COURSE_TYPES } from "../../constants/courseType";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoGenerationCircularIntegration from "./AutoGenerationCircularIntegration";
import axiosClient from "../../api/axiosClient";
import { getEffectiveTypeForProgramme } from "../../utils/getEffectiveCourseType";

const EditableCourseTable = ({ courses, onRemove, editMode = false, programmeName="" }) => (
  <TableContainer component={Paper} sx={{ mb: 2 }}>
    <Table>
      <TableHead>
        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
          <TableCell><strong>Course Code</strong></TableCell>
          <TableCell><strong>Course Name</strong></TableCell>
          <TableCell><strong>Credit Hours</strong></TableCell>
          <TableCell><strong>Type</strong></TableCell>
          {editMode &&<TableCell><strong>Action</strong></TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {courses.length > 0 ? (
          courses.map((course, idx) => {
            const effectiveCourseType = getEffectiveTypeForProgramme(course, programmeName)
            return (
            <TableRow key={idx}>
              <TableCell>{course.course_code}</TableCell>
              <TableCell>{course.course_name}</TableCell>
              <TableCell>{course.credit_hours}</TableCell>
              <TableCell>{READABLE_COURSE_TYPES[effectiveCourseType]}</TableCell>
              {editMode &&              
                <TableCell>
                  <button
                    onClick={() => onRemove(idx)}
                    className="text-sm text-red-600"
                  >
                    Remove
                  </button>
                </TableCell>}
            </TableRow>
          )})
        ) : (
          <TableRow>
            <TableCell
              colSpan={5}
              sx={{
                textAlign: 'center',
                fontStyle: 'italic',
                color: 'text.secondary',
                bgcolor: '#f9f9f9',
                py: 2,
              }}
            >
              No courses
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const CoursePlan = ({ programmeEnrollment, editMode, onChange, onCreate, generated, setGenerated }) => {
  const [ semesterPlans, setSemesterPlans] = useState([]);
  const [ addSelectState, setAddSelectState] = useState({});
  const [ remaining, setRemaining ] = useState([])
  const [ showSelect, setShowSelect] = useState({});
  const [ expandedYears, setExpandedYears] = useState({});

useEffect(() => {
  if (!programmeEnrollment) return;

  const hold = programmeEnrollment.programme_plan?.semester_plans || [];
  const graduationRequirements = programmeEnrollment.graduation_requirements || [];

  let latestSemesterPlan;
  const minSem = Number(programmeEnrollment.min_semester) || 7;
  if (hold.length !== minSem) {

    latestSemesterPlan = Array.from({ length: minSem }, (_, idx) => {
      const exist = hold[idx]

      return {
        semester : idx + 1,
        courses : exist?.courses || []
      }
    })

    onChange(latestSemesterPlan)

  } else {
    latestSemesterPlan = hold.map((sem, index) => ({
      semester: index + 1,
      courses: sem.courses || []
    }));
  }

  setExpandedYears((prev) => {
    const newExpanded = {};
    for (let yearIdx = 0; yearIdx < Math.ceil(minSem/2); yearIdx++) {
      // If a value exists in prev, keep it; else default to false
      newExpanded[yearIdx] = prev[yearIdx] ?? false;
    }
    return newExpanded;
  });
    
  const allocatedCourseCodes = latestSemesterPlan.flatMap((sem) =>
    sem.courses.map((c) => c.course_code)
  );

  const remainingCourses = graduationRequirements.filter(
    (course) => !allocatedCourseCodes.includes(course.course_code)
  );

  setSemesterPlans(latestSemesterPlan);
  setRemaining(remainingCourses);
}, [programmeEnrollment]);


  const handleAddCourse = (semIndex, courseCode) => {
    if (!courseCode) return;

    const courseObj = remaining.find((c) => c.course_code === courseCode);
    if (!courseObj) return;

    setSemesterPlans((prev) => {
      const updated = prev.map((sem) => ({
        ...sem,
        courses: [...sem.courses]
      }));

      updated[semIndex].courses.push(courseObj);

      onChange(updated);
      return updated;
    });

    // Remove from remaining
    setRemaining((prev) => prev.filter((c) => c.course_code !== courseCode));

    // Reset select
    setAddSelectState((p) => ({ ...p, [semIndex]: "" }));
        // Hide select after selecting a course
    setShowSelect((p) => ({ ...p, [semIndex]: false }));

  };

  const handleRemoveCourse = (semIndex, courseIdx) => {
    setSemesterPlans((prev) => {
      const updated = prev.map((sem) => ({
        ...sem,
        courses: [...sem.courses]
      }));

      const removed = updated[semIndex].courses.splice(courseIdx, 1)[0];

      // Add it back to remaining
      setRemaining((prev) => [...prev, removed]);

      onChange(updated);
      return updated;
    });
  };

const handleYearAccordionChange = (yearIdx) => (event, isExpanded) => {
  setExpandedYears((prev) => ({ ...prev, [yearIdx]: isExpanded }));

  // Hide all selects in this year when collapsed
  if (!isExpanded) {
    const newShowSelect = { ...showSelect };
    for (let i = 0; i < 2; i++) {
      const semIndex = yearIdx * 2 + i;
      newShowSelect[semIndex] = false;
    }
    setShowSelect(newShowSelect);
  }
};

const handleOnGenerate = async () => {
  try{
    const payload = {
      graduation_requirements : programmeEnrollment.graduation_requirements,
      semesterPlans : semesterPlans,
      programme_name : programmeEnrollment.programme_name
    }
    const res = await axiosClient.post("/programme-plans/generate-draft", payload)
    const draftedSemesterPlans = res.data
    setGenerated(true)
    onChange(draftedSemesterPlans)

  }catch(err){
    console.log("Error generating draft programme plan")
  }finally{
    setExpandedYears(prev =>
      Object.fromEntries(
        Object.keys(prev).map(key => [key, true])
      )
    );
  }
}

  const yearGroups = [];
  for (let i = 0; i < semesterPlans.length; i += 2) {
    yearGroups.push(semesterPlans.slice(i, i + 2));
  }

  const courseOptions = remaining.map((req) => ({
    value: req.course_code,
    label: `${req.course_code} — ${req.course_name}`,
    course: req
  }));


  return (
    <div style={{ width: "90%", margin: "auto", marginTop: "2rem", paddingBottom: "1.5rem" }}>
      <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
        Default Course Plan for {programmeEnrollment?.programme_name} — Session{" "}
        {programmeEnrollment?.year} {programmeEnrollment?.semester}
      </Typography>

      {(onCreate || editMode) &&
        <AutoGenerationCircularIntegration 
          onGenerate={handleOnGenerate} 
          success={generated}
          setSuccess={setGenerated}
        /> 
      }

      {yearGroups.map((year, yearIdx) => (
        <Accordion
          key={yearIdx}
          expanded={expandedYears[yearIdx] || false}
          onChange={handleYearAccordionChange(yearIdx)} // move onChange here
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">Year {yearIdx + 1}</Typography>
          </AccordionSummary>

          <AccordionDetails>
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              {year.map((semObj, idx) => {
                const semIndex = yearIdx * 2 + idx;
                const courses = semObj.courses || [];

                return (
                  <div key={idx} style={{ flex: "1 1 45%" }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ fontWeight: 600, m: 0 }}   // ⭐ remove bottom margin
                    >
                      {"Semester " + (idx + 1)}
                    </Typography>

                    <EditableCourseTable
                      courses={courses}
                      onRemove={(i) => handleRemoveCourse(semIndex, i)}
                      editMode={editMode}
                      programmeName={programmeEnrollment?.programme_name}
                    />

                    {editMode && showSelect[semIndex] && (
                      <div style={{ marginBottom: 12 }}>
                        <select
                          value={addSelectState[semIndex] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddSelectState((p) => ({ ...p, [semIndex]: val }));
                            if (val) handleAddCourse(semIndex, val);
                          }}
                          className="border rounded p-2 w-full text-sm"
                        >
                          <option value="">
                            — Add course from remaining courses —
                          </option>
                          {courseOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {editMode && (
                      <button
                        onClick={() =>
                          setShowSelect((prev) => ({ ...prev, [semIndex]: true }))
                        }
                        className="mt-1 bg-blue-500 text-white px-2 py-1 rounded text-sm"
                      >
                        Add Course
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </AccordionDetails>
        </Accordion>
      ))}

    </div>
  );
};

export default CoursePlan;
