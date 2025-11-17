import { useState, useEffect } from 'react';
import { useOutletContext } from "react-router-dom";
import { READABLE_COURSE_TYPES } from "../../constants/courseType";
import axiosClient from '../../api/axiosClient';
import {
  Accordion, AccordionSummary, AccordionDetails, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper,
  RadioGroup, FormControlLabel, Radio, Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { MessageSquare } from "lucide-react";
import FeedbackModal from "./FeedbackModal"; // ⭐ you'll create this next

const CourseTable = ({ courses , plan=false }) => (
  <TableContainer 
    component={Paper}
    sx={{
      mb: 2,
      backgroundColor: plan ? "#e3f2fd" : "white",  // ⭐ blue background if it's a course plan
      border: plan ? "1px solid #64b5f6" : "none"
    }}
  >
    <Table>
      <TableHead>
        <TableRow sx={{ backgroundColor: plan ? "#90caf9" : '#f5f5f5' }}>
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
          );
        })}
      </TableBody>
    </Table>
  </TableContainer>
);

const StudentAcademicProfile = () => {
  const { academicProfile, student } = useOutletContext();
  const [coursePlans, setCoursePlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [itemsToDisplay, setItemsToDisplay] = useState([]);

  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Fetch all available course plans for the student
  useEffect(() => {
    const fetchCoursePlans = async () => {
      try {
        const response = await axiosClient.get(`/academic-plans/students/${student._id}/plans`);
        const coursePlans = response.data.data;
        setCoursePlans(coursePlans || []);
        
      } catch (error) {
        console.error("Error fetching course plans:", error);
      }
    };
    if(student && student._id){
      fetchCoursePlans();
    }
  }, [student]);

  // Fetch selected course plan details
  useEffect(() => {
    const fetchSelectedPlan = async () => {
      if (!selectedPlanId) {
        setSelectedPlan(null)
        return
      };
      try {
        const response = await axiosClient.get(`/academic-plans/plans/${selectedPlanId}`);
        setSelectedPlan(response.data.data);
      } catch (error) {
        console.error("Error fetching selected plan:", error);
      }
    };
    fetchSelectedPlan();
  }, [selectedPlanId]);

  // Combine actual academic entries + selected plan
  useEffect(() => {
    let items = [];
    if (academicProfile && academicProfile.entries.length > 0) {
      const coursesTaken = academicProfile.entries;
      items = coursesTaken.reduce((acc, courseObj) => {
        const year = courseObj.year;
        const semester = courseObj.semester;

        if (!acc[year - 1]) acc[year - 1] = [];
        if (!acc[year - 1][semester - 1]) {
          acc[year - 1][semester - 1] = { plan: false, courses: [] };
        }

        acc[year - 1][semester - 1]["courses"].push(courseObj);
        return acc;
      }, []);
    }

    if (selectedPlan && selectedPlan.years.length > 0) {
      selectedPlan.years.forEach((yearPlan) => {
        if (!items[yearPlan.year - 1]) items[yearPlan.year - 1] = [];
        yearPlan.semesters.forEach((semesterPlan, idx) => {
          if(!items[yearPlan.year - 1][idx]){
            items[yearPlan.year - 1][idx] = { plan: true, courses: semesterPlan.courses }
          };
        });
      });
    }

    setItemsToDisplay(items);
  }, [academicProfile, selectedPlan]);

  return (
    <div style={{ width: '90%', margin: 'auto', marginTop: '2rem' }}>
      <Typography variant="body1" gutterBottom>
        View the student’s academic courses. You can explore their actual completed courses or see them organized according to a course plan.
      </Typography>

      {/* Radio group + feedback icon */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem"
      }}>
        <RadioGroup
          row
          value={selectedPlanId || 'no-plan'}
          onChange={(e) => setSelectedPlanId(e.target.value === 'no-plan' ? null : e.target.value)}
        >
          <FormControlLabel value="no-plan" control={<Radio />} label="Completed Courses" />

          {coursePlans.map((plan) => (
            <FormControlLabel
              key={plan._id}
              value={plan._id}
              control={<Radio />}
              label={plan.name || 'Unnamed Plan'}
            />
          ))}
        </RadioGroup>

        {/* ⭐ Comment icon only visible when a course plan is selected */}
        {selectedPlanId && (
          <button
            onClick={() => setFeedbackOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <MessageSquare size={20} color="#1976d2" />
            <span style={{ color: "#1976d2", fontWeight: 500 }}>Comment</span>
          </button>
        )}
      </div>

      {/* ⭐ The modal */}
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        student={student}
        coursePlan={selectedPlan}
      />

      {/* Display Semesters */}
      {itemsToDisplay.length > 0 ? (
        itemsToDisplay.map((yearItem, yearIdx) => (
          <Accordion key={yearIdx} defaultExpanded={yearIdx === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">{"Year " + (yearIdx + 1)}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {yearItem.length > 0 ? (
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                  {yearItem.map((semesterObj, semIdx) => (
                    <div
                      key={semIdx}
                      style={{
                        flex: "1 1 45%",
                        padding: "1rem",
                        backgroundColor: semesterObj.plan ? "#e3f2fd" : "#fff",
                        borderRadius: "8px",
                        border: semesterObj.plan ? "1px solid #64b5f6" : "1px solid #ccc"
                      }}
                    >
                      <Typography variant="subtitle1" gutterBottom>
                        {"Semester " + (semIdx + 1)}
                      </Typography>
                      {semesterObj.courses?.length > 0 ? (
                        <CourseTable courses={semesterObj.courses} plan={semesterObj.plan}/>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          No courses
                        </Typography>
                      )}
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
        ))
      ) : (
        <Typography color="text.secondary" fontStyle="italic">
          Select a course plan to view its details.
        </Typography>
      )}
    </div>
  );
};

export default StudentAcademicProfile;

