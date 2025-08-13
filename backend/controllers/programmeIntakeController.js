const { formatProgrammeIntake , formatProgrammeIntakes } = require("../utils/formatter/programmeIntakeFormatter");

const ProgrammeIntake = require("../models/ProgrammeIntake");
const Programme = require("../models/Programme");
const AcademicSession = require("../models/AcademicSession");
const SemesterPlan = require("../models/SemesterPlan")
const ProgrammePlan = require("../models/ProgrammePlan")
const Course = require("../models/Course");

const getAllProgrammeIntakes = async (req, res) => {
  try {
    const programmeIntakes = await ProgrammeIntake.find().populate("programme_id").populate("academic_session_id");
    res.status(200).json(formatProgrammeIntakes(programmeIntakes));
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error fetching programme intakes: ", error);
  }
};

// Add programme intake (unchanged)
const addProgrammeIntake = async (req, res) => {
  try {
    const {
      programme_code,
      year,
      semester,
      number_of_students_enrolled,
      graduation_rate,
      min_semester,
      max_semester,
      graduation_requirements,
      coursePlanAutoGenerate
    } = req.body;

    let programmePlanId = null

    const programme = await Programme.findOne({ programme_code });
    if (!programme) {
      return res.status(404).json({ message: "Programme not found" });
    }

    const academicSession = await AcademicSession.findOne({ year, semester });
    if (!academicSession) {
      return res.status(404).json({ message: "Academic session not found" });
    }

    const courseList = Object.values(graduation_requirements).flat();

    let coursePlan

    const selectedCourseCodes = courseList.map(course => course.course_code);
    const semesterPlans = [];

    if(coursePlanAutoGenerate && courseList.length > 0){
            // 1. Fetch full course objects
      const selectedCourses = await Course.find({
        course_code: { $in: selectedCourseCodes },
      });

      // 2. Sort by study_level first, then topo-sort by prerequisites
      selectedCourses.sort((a, b) => {
        const typeOrder = {
          faculty_core: 0,
          programme_core: 1,
          programme_elective: 2,
        };

        const typeA = typeOrder[a.type] ?? 99;
        const typeB = typeOrder[b.type] ?? 99;

        if (typeA !== typeB) return typeA - typeB;
        return a.study_level - b.study_level; // fallback to study_level
      });      
      const sortedCourses = await topologicalSort(selectedCourses);

      // 3. Distribute evenly into semesters
      const coursesPerSemester = Math.ceil(sortedCourses.length / min_semester);

      for (let i = 0; i < min_semester; i++) {
        const sliceStart = i * coursesPerSemester;
        const sliceEnd = (i + 1) * coursesPerSemester;
        const semesterCourses = sortedCourses.slice(sliceStart, sliceEnd);

        const semesterPlan = await SemesterPlan.create({
          courses: semesterCourses.map(c => c._id),
          academic_session_id: null, // optional if you want to link later
        });

        semesterPlans.push(semesterPlan._id);
      }
    }

      const programmePlan = await ProgrammePlan.create({
          title: `${programme_code} Auto Plan (${year})`,
          semester_plans: semesterPlans,
      });

      programmePlanId = programmePlan

    // console.log("Course plan: ", coursePlan)
    const required_course_ids = await Promise.all(
      courseList.map(async (course) => {
        const currentCourse = await Course.findOne({ course_code: course.course_code });
        return currentCourse?._id;
      })
    );

    const newProgrameIntake = new ProgrammeIntake({
      programme_intake_code : generateProgrammeIntakeCode(programme, year, semester),
      programme_id : programme._id,
      academic_session_id : academicSession._id,
      number_of_students_enrolled : number_of_students_enrolled ?? 0,
      graduation_rate : graduation_rate ?? 0,
      min_semester,
      max_semester,
      graduation_requirements: required_course_ids,
      course_plan : coursePlan,
      programme_plan : programmePlanId,
    });

    const savedProgrameIntake = await newProgrameIntake.save();
    res.status(201).json(savedProgrameIntake);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error adding new academic session programme: ", error);
  }
};

const getProgrammeIntakeById = async (req, res) => {
  try {
    const { id } = req.params;

    const programmeIntake = await ProgrammeIntake.findOne({programme_intake_code : id})
      .populate("graduation_requirements")
      .populate("programme_id")
      .populate("academic_session_id")
      .populate({
        path: "programme_plan",
        populate: {
          path: "semester_plans",
          populate: {
            path: "courses"
          }
        }
    });

    if (!programmeIntake) {
      return res.status(404).json({ message: "Programme intake not found" });
    }        

    res.status(200).json(formatProgrammeIntake(programmeIntake));
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error fetching programme intake by ID:", error);
  }
};

const deleteProgrammeIntakeById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProgrammeIntake = await ProgrammeIntake.findOneAndDelete({programme_intake_code : id})

    if (!deletedProgrammeIntake) {
      return res.status(404).json({ message: "Programme intake not found" });
    }

    res.status(200).json(formatProgrammeIntake(deletedProgrammeIntake));
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error deleting programme intake by ID:", error);
  }
};

const generateProgrammeIntakeCode = ( programme, year, semester) => {
  // Split year from "2023/2024" to "23" and "24"
  const [startYear, endYear] = year.split("/").map((y) => y.slice(-2)); // ["23", "24"]

  // Convert semester to short form
  const semesterMap = {
    "Semester 1": "S1",
    "Semester 2": "S2",
    "Special Semester": "SS",
  };
  const shortSemester = semesterMap[semester] || semester.replace(/\s+/g, '').toUpperCase(); // fallback

  const programmeIntakeCode = `${programme.programme_code}-${startYear}-${endYear}-${shortSemester}`;
  return programmeIntakeCode
}

const topologicalSort = async (courses) => {
  const courseMap = {};
  const inDegree = {};
  const graph = {};

  // Initialize map
  courses.forEach(course => {
    const id = course._id.toString();
    courseMap[id] = course;
    inDegree[id] = 0;
    graph[id] = [];
  });

  // Fetch missing prerequisite courses from DB if not in the list
  for (const course of courses) {
    const courseId = course._id.toString();
    const prereqs = course.prerequisites || [];

    for (const prereq of prereqs) {
      const prereqId = prereq._id?.toString() || prereq.toString();

      if (!graph[prereqId]) {
        // Not in original list, try fetch from DB
        const missingCourse = await Course.findById(prereqId);
        if (missingCourse) {
          courseMap[prereqId] = missingCourse;
          inDegree[prereqId] = 0;
          graph[prereqId] = [];
        } else {
          console.warn(`⚠️ Prerequisite course with ID ${prereqId} not found in DB`);
          continue; // skip if not found
        }
      }

      graph[prereqId].push(courseId);
      inDegree[courseId] = (inDegree[courseId] || 0) + 1;
    }
  }

  // Kahn’s algorithm
  const queue = [];
  const result = [];

  for (const [id, degree] of Object.entries(inDegree)) {
    if (degree === 0) queue.push(id);
  }

  while (queue.length) {
    const current = queue.shift();
    result.push(courseMap[current]);

    for (const neighbor of graph[current]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  if (result.length !== Object.keys(courseMap).length) {
    throw new Error("Cycle detected or unresolved prerequisite chain.");
  }

  return result;
};




module.exports = {
  getAllProgrammeIntakes,
  addProgrammeIntake,
  getProgrammeIntakeById,
  deleteProgrammeIntakeById
};
