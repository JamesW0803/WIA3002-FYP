import React, { useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
  Box,
  Grid,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ActionBar from '../../../components/form/ActionBar';
import { useLocation , useNavigate } from "react-router-dom";
import axiosClient from '../../../api/axiosClient';

const availableCourses = [
  { code: 'WIX1002', name: 'Fundamentals of Programming' },
  { code: 'WIX1003', name: 'Data Structures' },
  { code: 'WIX1004', name: 'Database Systems' },
  // Add more courses as needed
];

const initialCourseData = [
  { title: 'University Courses', requiredCredits: 14, courses: [] },
  { title: 'Faculty Core Courses', requiredCredits: 17, courses: [] },
  { title: 'University Elective Courses', requiredCredits: 8, courses: [] },
  { title: 'Programme Core Courses', requiredCredits: 59, courses: [] },
  { title: 'Specialization Elective Courses', requiredCredits: 30, courses: [] },
];

const AddProgrammeEnrollment = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    programme_code: '',
    year: '',
    semester: '',
    min_semester: '',
    max_semester: '',
    coursePlanAutoGenerate: false,
  });

  const [categories, setCategories] = useState(initialCourseData);

  const handleCourseToggle = (categoryIndex, courseCode) => {
    setCategories((prev) =>
      prev.map((cat, idx) => {
        if (idx !== categoryIndex) return cat;
        const isAlreadyAdded = cat.courses.some((c) => c.code === courseCode);
        return {
          ...cat,
          courses: isAlreadyAdded
            ? cat.courses.filter((c) => c.code !== courseCode)
            : [...cat.courses, availableCourses.find((c) => c.code === courseCode)],
        };
      })
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };


    const handleCancel = () => {
        navigate(`/admin/programme-intakes/`)
    }

    const handleAdd = async() => {
        // Submit programme intake form
        try {
            const payload = {
                ...formData
            }
            console.log("Payload: ", payload)
            const response = await axiosClient.post("/programme-intakes", payload);
            const newProgrammeEnrollment = response.data
            console.log("Programme Enrollment is added successfully")
        } catch (error) {
            console.error("Error creating programme enrollment: ", error);
        } finally {
            navigate(`/admin/programme-intakes`)
        }    
        console.log("YES")  
    }
    
    const cancelButton = {
        title : "Cancel",
        onClick : handleCancel
    }

    const addButton = {
        title : "Add",
        onClick : handleAdd
    }

  return (
    <Box sx={{ width: '80%', margin: 'auto', marginTop: '2rem' }}>
      <Typography variant="h5" gutterBottom>
        Add Programme Enrollment
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          select
          label="Programme Code"
          name="programme_code"
          value={formData.programme_code}
          onChange={handleChange}
        >
          {[
            { code: 'SE', name: 'Bachelor of Computer Science(Software Engineering)' },
            { code: 'AI', name: 'Bachelor of Computer Science(Artificial Intelligence)' },
            { code: 'CSN', name:'Bachelor of Computer Science(Computer System and Networking)' },
          ].map((prog) => (
            <MenuItem key={prog.code} value={prog.code}>
              {prog.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Intake Year"
          name="year"
          value={formData.year}
          onChange={handleChange}
        >
          {["2022/2023", "2023/2024", "2024/2025", "2025/2026"].map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Intake Session"
          name="semester"
          value={formData.semester}
          onChange={handleChange}
        >
          {['Semester 1', 'Semester 2', 'Special Semester'].map((session) => (
            <MenuItem key={session} value={session}>
              {session}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Duration (Min)"
          name="min_semester"
          value={formData.min_semester}
          onChange={handleChange}
        >
          {[6, 7, 8].map((sem) => (
            <MenuItem key={sem} value={sem}>
              {sem} Semesters
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Duration (Max)"
          name="max_semester"
          value={formData.max_semester}
          onChange={handleChange}
        >
          {[10, 11, 12].map((sem) => (
            <MenuItem key={sem} value={sem}>
              {sem} Semesters
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box mt={4}>
        <Typography variant="body1" gutterBottom>
          Students are required to complete a total of 128 credit hours by fulfilling
          the minimum credit requirements from each of the course categories below:
        </Typography>

        {categories.map((cat, index) => (
          <Accordion key={index}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">
                {cat.title} ({cat.requiredCredits} credits required)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {availableCourses.map((course) => (
                <Box
                  key={course.code}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  py={1}
                >
                  <Box>
                    <Typography variant="body2">
                      {course.code} - {course.name}
                    </Typography>
                  </Box>
                  <Checkbox
                    checked={cat.courses.some((c) => c.code === course.code)}
                    onChange={() => handleCourseToggle(index, course.code)}
                  />
                </Box>
              ))}
              {availableCourses.length === 0 && (
                <Typography fontStyle="italic" color="text.secondary">
                  No courses available
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      <FormControlLabel
        control={
          <Checkbox
            checked={formData.coursePlanAutoGenerate}
            onChange={handleChange}
            name="coursePlanAutoGenerate"
          />
        }
        label="Auto-generate semester-to-semester course plan"
        sx={{ mt: 2 }}
      />
        <ActionBar button1={cancelButton} button2={addButton}/>
    </Box>
  );
};

export default AddProgrammeEnrollment;
