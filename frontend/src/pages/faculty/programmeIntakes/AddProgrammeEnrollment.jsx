
import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Box,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ActionBar from '../../../components/form/ActionBar';
import { READABLE_COURSE_TYPES } from '../../../constants/courseType';
import { useNavigate } from "react-router-dom";
import axiosClient from '../../../api/axiosClient';

// Title and credits mapping
const typeToCategoryTitle = {
  university: { title: 'University Courses', requiredCredits: 14 },
  faculty_core: { title: 'Faculty Core Courses', requiredCredits: 17 },
  university_elective: { title: 'University Elective Courses', requiredCredits: 8 },
  programme_core: { title: 'Programme Core Courses', requiredCredits: 59 },
  specialization_elective: { title: 'Specialization Elective Courses', requiredCredits: 30 },
};

const AddProgrammeEnrollment = () => {
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState([])
  const [academicSession, setAcademicSession] = useState([])
  const [formData, setFormData] = useState({
    programme_code: '',
    year: '',
    semester: '',
    min_semester: '',
    max_semester: '',
    coursePlanAutoGenerate: false,
  });

  const [groupedCategories, setGroupedCategories] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState({});

  // Fetch and group courses
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosClient.get("/courses");
        const programmeRes = await axiosClient.get("/programmes")
        const academicSessionRes = await axiosClient.get("/academic-sessions")

        setAcademicSession(academicSessionRes.data)
        setProgrammes(programmeRes.data)
        const courses = response.data;

        // Group by course type
        const grouped = courses.reduce((acc, course) => {
          if (!acc[course.type]) acc[course.type] = [];
          acc[course.type].push(course);
          return acc;
        }, {});

        const transformed = Object.entries(grouped).map(([type, courses]) => ({
          type,
          title: READABLE_COURSE_TYPES[type],
          requiredCredits: typeToCategoryTitle[type]?.requiredCredits || 0,
          courses,
        }));

        setGroupedCategories(transformed);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchData();
  }, []);

const handleCourseToggle = (type, course) => {
  setSelectedCourses((prev) => {
    const prevSelected = prev[type] || [];
    const isSelected = prevSelected.some((c) => c.course_code === course.course_code);
    const updated = isSelected
      ? prevSelected.filter((c) => c.course_code !== course.course_code)
      : [...prevSelected, course];

    return {
      ...prev,
      [type]: updated,
    };
  });
};


  // Form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Cancel
  const handleCancel = () => {
    navigate(`/admin/programme-intakes/`);
  };

  // Submit
  const handleAdd = async () => {
    try {
      const payload = {
        ...formData,
        graduation_requirements: selectedCourses, // Optional: structure as needed
      };
      const response = await axiosClient.post("/programme-intakes", payload);
    } catch (error) {
      console.error("Error creating programme enrollment:", error);
    } finally {
      navigate(`/admin/programme-intakes`);
    }
  };

  // Buttons
  const cancelButton = { title: "Cancel", onClick: handleCancel };
  const addButton = { title: "Add", onClick: handleAdd };

  const totalSelectedCredits = Object.values(selectedCourses).flat().reduce(
  (sum, course) => sum + (course.credit_hours || 0),
  0
);

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
          {programmes.map((prog) => (
            <MenuItem key={prog.programme_code} value={prog.programme_code}>
              {prog.programme_name}
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
          {academicSession.map((academicSession) => (
            <MenuItem key={academicSession.year} value={academicSession.year}>
              {academicSession.year}
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
        Students must complete a total of <strong>{totalSelectedCredits}</strong> credit hours based on selected courses:
      </Typography>


        {groupedCategories.map((category) => (
          <Accordion key={category.type}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">
                {category.title} ({(selectedCourses[category.type]?.reduce((sum, c) => sum + (c.credit_hours || 0), 0) || 0)} credits selected)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {category.courses.map((course) => (
                <Box
                  key={course.course_code}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  py={1}
                >
                  <Typography variant="body2">
                    {course.course_code} - {course.course_name}
                  </Typography>
                  <Checkbox
                    checked={
                      (selectedCourses[category.type] || []).some(
                        (c) => c.course_code === course.course_code
                      )
                    }
                    onChange={() => handleCourseToggle(category.type, course)}
                  />
                </Box>
              ))}
              {category.courses.length === 0 && (
                <Typography fontStyle="italic" color="text.secondary">
                  No courses available in this category.
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

      <ActionBar button1={cancelButton} button2={addButton} />
    </Box>
  );
};

export default AddProgrammeEnrollment;
