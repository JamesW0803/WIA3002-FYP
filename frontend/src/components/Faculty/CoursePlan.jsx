import React from 'react';
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

const coursePlan = [
  {
    year: 'Year 1',
    semesters: [
      {
        name: 'Semester 1',
        courses: [
          {
            code: 'WIX1002',
            name: 'Fundamentals of Programming',
            credit: 5,
            type: 'Faculty Core Course',
          },
          {
            code: 'WIX1002',
            name: 'Fundamentals of Programming',
            credit: 5,
            type: 'Faculty Core Course',
          },
        ],
      },
    ],
  },
  {
    year: 'Year 2',
    semesters: [
      {
        name: 'Semester 1',
        courses: [
          {
            code: 'WIX1002',
            name: 'Fundamentals of Programming',
            credit: 5,
            type: 'Faculty Core Course',
          },
          {
            code: 'WIX1002',
            name: 'Fundamentals of Programming',
            credit: 5,
            type: 'Faculty Core Course',
          },
        ],
      },
    ],
  },
  {
    year: 'Year 3',
    semesters: [],
  },
  {
    year: 'Year 4',
    semesters: [],
  },
];

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
        {courses.map((course, index) => (
          <TableRow key={index}>
            <TableCell>{course.code}</TableCell>
            <TableCell>{course.name}</TableCell>
            <TableCell>{course.credit}</TableCell>
            <TableCell>{course.type}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const CoursePlan = () => {
  return (
    <div style={{ width: '90%', margin: 'auto', marginTop: '2rem' }}>
      <Typography variant="body2" gutterBottom>
        Reference course plan for students enrolled in Bachelor of Computer Science
        (Software Engineering) session 2022/2023 Semester 1
      </Typography>

      {coursePlan.map((yearItem, yearIdx) => (
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

export default CoursePlan;
