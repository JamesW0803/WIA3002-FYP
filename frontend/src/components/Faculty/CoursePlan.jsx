import { useState , useEffect } from 'react';
import { useOutletContext } from "react-router-dom";
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axiosClient from '../../api/axiosClient';

const CourseTable = ({ courses }) => (
  <TableContainer component={Paper} sx={{ mb: 2 }}>
    <Table>
      <TableHead>
        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
          <TableCell><strong>Course Code</strong></TableCell>
          <TableCell><strong>Course Name</strong></TableCell>
          <TableCell><strong>Credit</strong></TableCell>
          <TableCell><strong>Type</strong></TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {courses.map((course, index) => {
          return (
          <TableRow key={index}>
            <TableCell>{course.course_code}</TableCell>
            <TableCell>{course.course_name}</TableCell>
            <TableCell>{course.credit_hours}</TableCell>
            <TableCell>{READABLE_COURSE_TYPES[course.type]}</TableCell>
          </TableRow>
          )
        })}
      </TableBody>
    </Table>
  </TableContainer>
);

const CoursePlan = () => {
  const { programmeEnrollment } = useOutletContext();
  const [ completeProgrammePlan, setCompleteProgrammePlan ] = useState({});
  
  useEffect(() => {
    const fetchProgrammePlan = async () => {
      try{
        const programmePlan = programmeEnrollment.programme_plan;
        const response = await axiosClient.get(`/programme-plans/${programmePlan._id}`);
        setCompleteProgrammePlan(response.data);
      }catch(error){
        console.error("Error fetching programme plan: ", error);
      }
    }
    fetchProgrammePlan();
    
  }, [programmeEnrollment]);

  const semesterPlans = completeProgrammePlan.semester_plans || [];

  // Group every 2 semesters into a "year"
  const yearGroups = [];
  for (let i = 0; i < semesterPlans.length; i += 2) {
    yearGroups.push(semesterPlans.slice(i, i + 2));
  }

  return (
    <div style={{ width: '90%', margin: 'auto', marginTop: '2rem' }}>
      <Typography variant="body2" gutterBottom>
        Reference course plan for students enrolled in {programmeEnrollment.programme_name} session {programmeEnrollment.year} {programmeEnrollment.semester}
      </Typography>

      {yearGroups.map((yearSemesters, yearIndex) => (
        <Accordion key={yearIndex} defaultExpanded={yearIndex === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">Year {yearIndex + 1}</Typography>
          </AccordionSummary>

          <AccordionDetails>
            {yearSemesters.map((semesterPlan, semIdx) => (
              <div key={semesterPlan._id || semIdx} style={{ marginBottom: '1.5rem' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Semester {semIdx + 1}
                </Typography>
                {semesterPlan.courses && semesterPlan.courses.length > 0 ? (
                  <CourseTable courses={semesterPlan.courses} />
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontStyle="italic"
                  >
                    No courses listed
                  </Typography>
                )}
              </div>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
};

export default CoursePlan;
