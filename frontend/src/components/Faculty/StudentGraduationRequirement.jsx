import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const courseData = [
  {
    title: 'University Courses',
    requiredCredits: 14,
    courses: [],
  },
  {
    title: 'Faculty Core Courses',
    requiredCredits: 17,
    courses: Array(5).fill({
      code: 'WIX1002',
      name: 'Fundamentals of Programming',
    }),
  },
  {
    title: 'University Elective Courses',
    requiredCredits: 8,
    courses: [],
  },
  {
    title: 'Programme Core Courses',
    requiredCredits: 59,
    courses: [],
  },
  {
    title: 'Specialization Elective Courses',
    requiredCredits: 30,
    courses: [],
  },
];

const StudentGraduationRequirement = () => {
  return (
    <div style={{ width: '80%', margin: 'auto', marginTop: '2rem' }}>
        <Header/>
        <CourseAccordion/>
    </div>
  );
};

const Header = () => {
    return (
        <Typography variant="body2" gutterBottom>
            Students are required to complete a total of 128 credit hours by fulfilling
            the minimum credit requirements from each of the course categories listed
            below
        </Typography>
)
}

const CourseAccordion = () => {
    return (
        <>
            {courseData.map((category, index) => (
                <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight="bold">
                    {category.title} ({category.requiredCredits} credits required)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    {category.courses.length > 0 ? (
                    category.courses.map((course, idx) => (
                        <Typography key={idx} variant="body2">
                        {course.code} {course.name}
                        </Typography>
                    ))
                    ) : (
                    <Typography variant="body2" fontStyle="italic" color="text.secondary">
                        No courses listed
                    </Typography>
                    )}
                </AccordionDetails>
                </Accordion>
            ))}
        </>

    )
}

export default StudentGraduationRequirement;
