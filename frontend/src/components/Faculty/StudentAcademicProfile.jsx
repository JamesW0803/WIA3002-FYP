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
        {courses.map((courseObj, index) => {
          const course = courseObj.course;
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

const StudentAcademicProfile = () => {
  const { academicProfile } = useOutletContext();
  const [ academicProfileSortedByYear , setAcademicProfileSortedByYear ] = useState([]);

  useEffect( () => {
    if(academicProfile && academicProfile.entries.length>0){
      const coursesTaken = academicProfile.entries;
      const sortedEntries = coursesTaken.reduce( (acc,courseObj) => {
        const year = courseObj.year;
        const semester = courseObj.semester;

        if(!acc[year-1]){
          acc[year-1] = [];
        }
        
        if(!acc[year-1][semester-1]){
          acc[year-1][semester-1] = [];
        }

        acc[year-1][semester-1].push(courseObj);
        return acc;

      }, []); 
      setAcademicProfileSortedByYear(sortedEntries);
    }

  }, [academicProfile]);

  return (
    <div style={{ width: '90%', margin: 'auto', marginTop: '2rem' }}>
      <Typography variant="body2" gutterBottom>
        Student Academic Profile 
      </Typography>

      {academicProfileSortedByYear.map((yearItem, yearIdx) => (
        <Accordion key={yearIdx} defaultExpanded={yearIdx === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{"Year " + (yearIdx+1)}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {yearItem.length > 0 ? (
              yearItem.map((semesterCourses, semIdx) => (
                <div key={semIdx}>
                  <Typography variant="subtitle1" gutterBottom>
                    {"Semester " + (semIdx + 1)}
                  </Typography>
                  <CourseTable courses={semesterCourses} />
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

export default StudentAcademicProfile;
