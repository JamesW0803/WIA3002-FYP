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
          <TableRow 
            key={index}
            sx={{
              backgroundColor: 'white', 
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: '#f5f5f5', 
                cursor: 'pointer'
              },
              borderRadius: 1,
              mb: 1
            }}
          >
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

const CoursePlan = ({ programmeEnrollment }) => {
  // const { programmeEnrollment } = useOutletContext();
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
    <div style={{ width: '90%', margin: 'auto', marginTop: '2rem', paddingBottom: '1.5rem' }}>
      <Typography variant="body1" gutterBottom style={{ marginBottom: "2rem"}}>
        Default Programme Plan for {programmeEnrollment?.programme_name}  
        {" "}session {programmeEnrollment?.year} {programmeEnrollment?.semester}
      </Typography>

      {yearGroups.map((yearItem, yearIdx) => (
        <Accordion key={yearIdx} defaultExpanded={yearIdx === -1}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{"Year " + (yearIdx+1)}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {yearItem.length > 0 ? (
              <div 
                style={{ 
                  display: "flex", 
                  gap: "2rem", 
                  flexWrap: "wrap"  // allows wrapping on small screens
                }}
              >
                {yearItem.map((semesterObj, semIdx) => (
                  <div key={semIdx} style={{ flex: "1 1 45%" }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {"Semester " + (semIdx + 1)}
                    </Typography>
                    <CourseTable courses={semesterObj.courses}/>
                  </div>
                  ))}
              </div>
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

export default CoursePlan;
