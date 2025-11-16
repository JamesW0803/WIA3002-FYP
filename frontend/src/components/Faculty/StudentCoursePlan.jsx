import { useState, useEffect } from 'react';
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
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axiosClient from '../../api/axiosClient';

const CourseTable = ({ courses }) => {
  return   (
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
          const course = courseObj.course
          return (
          <TableRow key={index}>
            <TableCell>{course.course_code}</TableCell>
            <TableCell>{course.course_name}</TableCell>
            <TableCell>{course.credit_hours}</TableCell>
            <TableCell>{READABLE_COURSE_TYPES[course.type]}</TableCell>
          </TableRow>
          )}
        )}
      </TableBody>
    </Table>
  </TableContainer> )
}
;

const StudentCoursePlan = () => {
  const { student } = useOutletContext();
  const [coursePlans, setCoursePlans] = useState([]); // all plans
  const [selectedPlanId, setSelectedPlanId] = useState(null); // current plan id
  const [selectedPlan, setSelectedPlan] = useState(null); // plan details

  // Fetch all available course plans for the student
  useEffect(() => {
    const fetchCoursePlans = async () => {
      try {        
        const response = await axiosClient.get(`/academic-plans/students/${student._id}/plans`);
        const coursePlans = response.data.data;
        setCoursePlans(coursePlans || []);

        // Default select the first plan (e.g., Default plan)
        if (coursePlans && coursePlans.length > 0) {
          setSelectedPlanId(coursePlans[0]._id);
        }

      } catch (error) {
        console.error("Error fetching course plans:", error);
      }
    };
    fetchCoursePlans();
  }, [student]);

  // Fetch selected course plan details
  useEffect(() => {
    const fetchSelectedPlan = async () => {
      if (!selectedPlanId) return;
      try {
        const response = await axiosClient.get(`/academic-plans/plans/${selectedPlanId}`);
        const coursePlan = response.data.data
        setSelectedPlan(coursePlan);

        console.log("Course plan: ", coursePlan)
        
      } catch (error) {
        console.error("Error fetching selected plan:", error);
      }
    };
    fetchSelectedPlan();
  }, [selectedPlanId]);

  return (
    <div style={{ width: '90%', margin: 'auto', marginTop: '2rem' }}>
      <Typography variant="body2" gutterBottom>
        Course plans for student {student.username}
      </Typography>

      {/* Dropdown to select course plan */}
      <Box sx={{ mb: 3, width: '300px' }}>
        <FormControl fullWidth size="small">
          <InputLabel>Select Course Plan</InputLabel>
          <Select
            value={selectedPlanId || ''}
            label="Select Course Plan"
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            {coursePlans.map((plan) => (
              <MenuItem key={plan._id} value={plan._id}>
                {plan.name || 'Unnamed Plan'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      

      {selectedPlan ? (
        selectedPlan.years.map((yearPlan, yearIndex) => (
          <Accordion key={yearIndex} defaultExpanded={yearIndex === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">Year {yearPlan.year}</Typography>
            </AccordionSummary>

            <AccordionDetails>
              {yearPlan.semesters.map((semesterPlan, semIdx) => (
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
        ))
      ) : (
        <Typography color="text.secondary" fontStyle="italic">
          Select a course plan to view its details.
        </Typography>
      )}
    </div>
  );
};

export default StudentCoursePlan;
