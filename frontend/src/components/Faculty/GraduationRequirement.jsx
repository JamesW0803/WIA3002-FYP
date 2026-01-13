import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Box,
  IconButton,
  Paper,
  Stack,
  Autocomplete,
  TextField,
} from "@mui/material";
import { useState, useEffect } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import axiosClient from "../../api/axiosClient";
import {
  COURSE_TYPES,
  READABLE_COURSE_TYPES,
} from "../../constants/courseType";
import { getEffectiveTypeForProgramme } from "../../utils/getEffectiveCourseType";

const GraduationRequirement = ({ programmeEnrollment, editMode, onChange }) => {
  const [requirements, setRequirements] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showSelect, setShowSelect] = useState({});
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [programmeName, setProgrammeName] = useState(programmeEnrollment?.programme_name ?? "")

  // Group existing requirements by *effective* type, not raw course.type
  useEffect(() => {
    if (!programmeEnrollment || !programmeEnrollment.graduation_requirements) {
      return;
    }

    const graduationRequirements = programmeEnrollment.graduation_requirements;

    const hold = graduationRequirements.reduce((acc, reqCourse) => {
      // Try to find the full formatted course object from /courses
      const fullCourse =
        courses.find((c) => c.course_code === reqCourse.course_code) ||
        reqCourse;

      // Use programme-specific type if available on the full course
      const effectiveType =
        getEffectiveTypeForProgramme(fullCourse, programmeName) ||
        fullCourse.type;

      if (!acc[effectiveType]) acc[effectiveType] = [];

      // Keep the original course data, but force the effective type so UI is consistent
      acc[effectiveType].push({ ...reqCourse, type: effectiveType });
      return acc;
    }, {});

    for (const type of COURSE_TYPES) {
      if (!hold[type]) hold[type] = [];
    }

    if(programmeEnrollment?.programme_name !== programmeName){
      setProgrammeName(programmeEnrollment?.programme_name)
    }

    setGrouped(hold);
    setRequirements(Object.values(hold).flat());
  }, [programmeEnrollment?.graduation_requirements, courses, programmeEnrollment.programme_name]);

  // Fetch all courses once
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axiosClient.get("/courses");
        setCourses(response.data);
        console.log("Fetched courses for GraduationRequirement:", response.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCourses();
  }, []);

  const handleDelete = (type, index) => {
    const current = grouped[type] || [];
    const updatedTypeList = current.filter((_, i) => i !== index);

    const newGrouped = {
      ...grouped,
      [type]: updatedTypeList,
    };

    const flattened = Object.values(newGrouped).flat();
    setGrouped(newGrouped);
    setRequirements(flattened);
    onChange?.(flattened);
  };

  const handleAddSelectChange = (type, selectedCourse) => {
    if (!selectedCourse) return;

    const current = grouped[type] || [];
    const newCourse = { ...selectedCourse, type }; // store with effective type for this intake

    const newGrouped = {
      ...grouped,
      [type]: [...current, newCourse],
    };

    const flattened = Object.values(newGrouped).flat();
    setGrouped(newGrouped);
    setRequirements(flattened);
    onChange?.(flattened);

    setShowSelect((prev) => ({ ...prev, [type]: false }));
  };

  const handleAddClick = (type) => {
    setShowSelect((prev) => ({ ...prev, [type]: true }));
    setExpandedCategories((prev) =>
      prev.includes(type) ? prev : [...prev, type]
    );
  };

  const totalCreditHours = requirements.reduce(
    (sum, course) => sum + (course.credit_hours || 0),
    0
  );

  const handleAccordionChange = (type) => (event, isExpanded) => {
    setExpandedCategories((prev) =>
      isExpanded ? [...prev, type] : prev.filter((c) => c !== type)
    );

    if (!isExpanded) {
      setShowSelect((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <Box sx={{ width: "80%", mx: "auto", mt: 4 }}>
      <Typography variant="body1" gutterBottom>
        Students are required to complete a total of{" "}
        <strong>{totalCreditHours}</strong> credit hours based on the course
        categories listed below.
      </Typography>

      {COURSE_TYPES.map((type, idx) => {
        const coursesInCategory = grouped[type] ?? [];
        const formattedTitle = READABLE_COURSE_TYPES[type];
        const totalCredits = coursesInCategory.reduce(
          (sum, c) => sum + (c.credit_hours || 0),
          0
        );

        return (
          <Accordion
            key={idx}
            expanded={expandedCategories.includes(type)}
            onChange={handleAccordionChange(type)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">
                {formattedTitle} ({totalCredits} credits)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {coursesInCategory.length > 0 ? (
                  coursesInCategory.map((course, idx2) => (
                    <Paper
                      elevation={0}
                      key={idx2}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 1,
                        "&:hover": { bgcolor: "#f0f0f0" },
                      }}
                    >
                      <Typography variant="body2">
                        {course.course_code} - {course.course_name} (
                        {course.credit_hours} credits)
                      </Typography>
                      {editMode && (
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(type, idx2)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Paper>
                  ))
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 1,
                      bgcolor: "#f9f9f9",
                      borderRadius: 1,
                      fontStyle: "italic",
                      color: "text.secondary",
                    }}
                  >
                    No courses in this category
                  </Paper>
                )}

                {editMode &&
                  showSelect[type] &&
                  expandedCategories.includes(type) && (
                    <Box sx={{ mt: 1 }}>
                      <Autocomplete
                        options={courses
                          .filter((c) => {
                            const effectiveType = getEffectiveTypeForProgramme(
                              c,
                              programmeName
                            );
                            return effectiveType === type;
                          })
                          .filter(
                            (c) =>
                              !coursesInCategory.some(
                                (existing) =>
                                  existing.course_code === c.course_code
                              )
                          )}
                        getOptionLabel={(c) =>
                          `${c.course_code} - ${c.course_name} (${c.credit_hours} credits)`
                        }
                        onChange={(e, value) =>
                          handleAddSelectChange(type, value)
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select a course"
                            variant="outlined"
                            size="small"
                            sx={{
                              bgcolor: "background.paper",
                              borderRadius: 1,
                            }}
                          />
                        )}
                        fullWidth
                        sx={{
                          ".MuiAutocomplete-popupIndicator": { right: 8 },
                          ".MuiAutocomplete-clearIndicator": { right: 32 },
                          mt: 0.5,
                        }}
                      />
                    </Box>
                  )}

                {editMode && (
                  <Button
                    startIcon={<AddIcon />}
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => handleAddClick(type)}
                    sx={{ mt: 1, alignSelf: "flex-start" }}
                  >
                    Add Course
                  </Button>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default GraduationRequirement;
