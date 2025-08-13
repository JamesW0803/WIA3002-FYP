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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useOutletContext } from "react-router-dom";
import React, { useMemo } from 'react';
import { READABLE_COURSE_TYPES } from '../../constants/courseType';

const CoursePlan = () => {
  const { coursePlan, programmeEnrollment } = useOutletContext();

  const semesterPlans = programmeEnrollment.programme_plan?.semester_plans || [];

  const transformedPlan = useMemo(() => transformPlan(semesterPlans), [semesterPlans]);

  return (
    <div style={{ width: '90%', margin: 'auto', marginTop: '2rem' }}>
      <Typography variant="body2" gutterBottom>
        Reference course plan for students enrolled in {programmeEnrollment.programme_name} session {programmeEnrollment.year} {programmeEnrollment.semester}
      </Typography>

      {transformedPlan.map((yearItem, yearIdx) => (
        <Accordion key={yearIdx} defaultExpanded={yearIdx === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{yearItem.year}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {yearItem.semesters.length > 0 ? (
              yearItem.semesters.map((semester, semIdx) => (
                <div key={semIdx}>
                  <Typography variant="subtitle1" gutterBottom>
                    {semester.name}
                  </Typography>
                  <CourseTable courses={semester.courses} />
                </div>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                No semesters listed
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
};

const CourseTable = ({ courses }) => (
  <TableContainer component={Paper} sx={{ mb: 2 }}>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Course Code</TableCell>
          <TableCell>Course Name</TableCell>
          <TableCell>Credit Hours</TableCell>
          <TableCell>Type</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {courses.map((course, idx) => (
          <TableRow key={idx}>
            <TableCell>{course.course_code}</TableCell>
            <TableCell>{course.course_name}</TableCell>
            <TableCell>{course.credit_hours}</TableCell>
            <TableCell>{course.type}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const transformPlan = (semesterPlans) => {
  const years = [];

  for (let i = 0; i < semesterPlans.length; i++) {
    const yearIndex = Math.floor(i / 2); // 2 semesters per year
    const semesterIndex = i % 2;

    if (!years[yearIndex]) {
      years[yearIndex] = {
        year: `Year ${yearIndex + 1}`,
        semesters: [],
      };
    }

    years[yearIndex].semesters.push({
      name: `Semester ${semesterIndex + 1}`,
      courses: semesterPlans[i].courses.map(course => ({
        course_code: course.course_code,
        course_name: course.course_name,
        credit_hours: course.credit_hours,
        type: READABLE_COURSE_TYPES[course.type],
        // type: course.type,

      })),
    });
  }

  return years;
};

export default CoursePlan;
