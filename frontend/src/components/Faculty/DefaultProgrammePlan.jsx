import { useState , useEffect } from 'react';
import { useOutletContext } from "react-router-dom";
import { READABLE_COURSE_TYPES } from "../../constants/courseType";
import axiosClient from '../../api/axiosClient';
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

const CourseTable = ({ courses , coursesTaken}) => (
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
          const taken = coursesTaken.find(courseTakenObj => courseTakenObj.course.course_code === course.course_code);
          return (
          <TableRow 
            key={index}
            sx={{
              backgroundColor: taken ? '#A5D6A7' : 'white', // soft green for taken courses
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: taken ? '#c8e6c9' : '#f5f5f5', // subtle hover effect
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

const DefaultProgrammePlan = () => {
    const { programme_intake_id , academicProfile} = useOutletContext();
    const [ programmeIntake, setProgrammeIntake ] = useState(null);
    const [ programmePlan, setProgrammePlan ] = useState(null);
    const [ programmePlanSortedByYear, setProgrammePlanSortedByYear ] = useState([]);
    const [ coursesTaken, setCoursesTaken ] = useState(academicProfile?.entries || []);

    useEffect( () => {
        const fetchProgrammeIntake = async () => {
            const response = await axiosClient.get(`/programme-intakes/id/${programme_intake_id}`);
            const programmeIntakeObj = response.data
            setProgrammeIntake(programmeIntakeObj);
            setProgrammePlan(programmeIntakeObj.programme_plan)
        }

        if(programme_intake_id) {
            fetchProgrammeIntake();
        }

    }, [programme_intake_id]);


    useEffect( () => {
        if(programmePlan && programmePlan.semester_plans?.length>0){
            const semesterPlans = programmePlan.semester_plans
            const grouped = [];
            for (let i = 0; i < semesterPlans.length; i += 2) {
                grouped.push(semesterPlans.slice(i, i + 2));
            }
            setProgrammePlanSortedByYear(grouped)
        }

    }, [programmePlan]);

    useEffect( () => {
      if(academicProfile && academicProfile.entries){
        setCoursesTaken(academicProfile.entries);
      }

    }, [academicProfile]);

  return (
    <div style={{ width: '90%', margin: 'auto', marginTop: '2rem' }}>
      <Typography variant="body2" gutterBottom>
        Default Programme Plan for {programmeIntake?.programme_name}  
        {" "}session {programmeIntake?.year} {programmeIntake?.semester}
      </Typography>

      {programmePlanSortedByYear.map((yearItem, yearIdx) => (
        <Accordion key={yearIdx} defaultExpanded={yearIdx === 0}>
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
                    <CourseTable courses={semesterObj.courses} coursesTaken={coursesTaken}/>
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

export default DefaultProgrammePlan;
