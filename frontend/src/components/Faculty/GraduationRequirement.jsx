import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useOutletContext } from 'react-router-dom';

const GraduationRequirement = () => {
  const { graduationRequirements } = useOutletContext(); // flat array
  
  // Group courses by category
  const grouped = graduationRequirements.reduce((acc, course) => {
    const type = course.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(course);
    return acc;
  }, {});


    // Calculate total credit hours
  const totalCreditHours = graduationRequirements.reduce(
    (sum, course) => sum + (course.credit_hours || 0),
    0
  );

  return (
    <div style={{ width: '80%', margin: 'auto', marginTop: '2rem' }}>
      <Header totalCredits={totalCreditHours}/>
      <CourseAccordion groupedCourses={grouped} />
    </div>
  );
};

const Header = ({ totalCredits }) => (
  <Typography variant="body2" gutterBottom>
    Students are required to complete a total of <strong>{totalCredits}</strong> credit hours
    based on the course categories listed below.
  </Typography>
);

const CourseAccordion = ({ groupedCourses }) => {
  return (
    <>
      {Object.entries(groupedCourses).map(([categoryKey, courses], index) => {
        const formattedTitle = categoryKey
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const totalCredits = courses.reduce(
          (sum, course) => sum + (course.credit_hours || 0),
          0
        );

        return (
          <Accordion key={index}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">
                {formattedTitle} ({totalCredits} credits)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {courses.map((course, idx) => (
                <Typography key={idx} variant="body2">
                  {course.course_code} - {course.course_name} ({course.credit_hours} credits)
                </Typography>
              ))}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </>
  );
};

export default GraduationRequirement;
