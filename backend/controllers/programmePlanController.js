const Student = require("../models/Student");
const ProgrammePlan = require("../models/ProgrammePlan");
const SemesterPlan = require("../models/SemesterPlan");
const Programme = require("../models/Programme");
const Course = require("../models/Course");
const AcademicSession = require("../models/AcademicSession");
const { TYPE_PRIORITY , FACULTY_COURSE_TYPES } = require("../constants/courseType")
const { createNextAcademicSession } = require("./academicSessionController")
const { generateProgrammeIntakeCode } = require("../utils/formatter/programmeIntakeFormatter")
const { SEMESTER_1, SEMESTER_2, SEMESTER_1_AND_2, } = require("../constants/semesters")

const getProgrammePlans = async (req, res) => {
  try {
    const student = await Student.findOne({
      email: "kennedy@gmail.com", //this is hardcoded, need further dev
    }).populate({
      path: "programme_plans",
      select: "semester_plans title",
      populate: {
        path: "semester_plans",
        select: "courses session",
        populate: {
          path: "courses",
          select: "course_code course_name",
        },
      },
    });

    res.status(200).json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getProgrammePlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const programmePlan = await ProgrammePlan.findById(id).populate({
      path: "semester_plans",
      populate: [
        {path: "courses"},
        {path: "academic_session_id"}
      ]
    });
    res.status(200).json(programmePlan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Programme plan not found" });
  }
};

const editProgrammePlan = async (updatedProgrammePlan, programme, academicSession) => {
  try {
    // Validate programme plan exists
    const plan = await ProgrammePlan.findById(updatedProgrammePlan._id);
    if (!plan) return "Programme not found";
    const semesterPlans = updatedProgrammePlan.semester_plans
    let update = false

    // update each semester plan
    let currentAcademicSession = academicSession
    for (let i = 0; i < semesterPlans.length; i++) {
      const semesterPlan = semesterPlans[i]

      const semesterPlanId = semesterPlan._id
      if(semesterPlanId){
        // update existing semester plan which already linked to the programme plan
        await SemesterPlan.findByIdAndUpdate(semesterPlanId, {
          courses: semesterPlan.courses?.map(course => course._id),
          academic_session_id: currentAcademicSession._id, 
        })
      }else{
        // create new semester plan and link to programme plan
        const newSemesterPlan = await SemesterPlan.create({
          programme_plan_id : plan._id,
          courses: semesterPlan.courses?.map(course => course._id),
          academic_session_id: currentAcademicSession._id, 
        });

        // store the newly created semester plan under programme plan
        plan.semester_plans.push(newSemesterPlan._id)
        update = true
      }

      if(currentAcademicSession.next === null){
        const nextAcademicSession = await createNextAcademicSession(currentAcademicSession);
        currentAcademicSession = await AcademicSession.findById(nextAcademicSession._id)
      }else{
        currentAcademicSession = await AcademicSession.findById(currentAcademicSession.next)
      }
    }

    // Update programme plan
    const updatedTitle = generateProgrammeIntakeCode(programme, academicSession.year, academicSession.semester)

    if(updatedTitle !== plan.title){
      plan.title = updatedTitle
      update = true
    }

    if(update){
      await plan.save()
    }

  }catch(err){
    console.log(err)
  }
}

const generateDraftProgrammePlan = async( req, res) => {
  try{
    const { 
      graduation_requirements, 
      semesterPlans,
      programme_name
    } = req.body

    const programme = await Programme.findOne({programme_name})
    const allocatedCourseCodes = semesterPlans.flatMap(semesterPlan => 
      semesterPlan.courses.map(course => course.course_code))
    const remainingCourses = graduation_requirements.filter((course) => !allocatedCourseCodes.includes(course.course_code))

    // Extract out the non-faculty courses 
    const facultyCourses = remainingCourses.filter((course) => isFacultyCourse(course));
    const nonFacultyCourses = remainingCourses.filter((course) => !isFacultyCourse(course));
    
    const sortedCourses = sortByLevelThenType(facultyCourses, TYPE_PRIORITY)
    const topoSortedCourses = await topologicalSortCourses(sortedCourses, programme)

    // Print topological sorted courses
    // console.log("=== Topologically Sorted Courses ===");
    // topoSortedCourses.forEach((course, index) => {
    //   console.log(`${index + 1}. ${course.course_code} - ${course.course_name}`);
    // });

    // const generatedDraft = distributeCoursesIntoSemesters(topoSortedCourses, semesterPlans)
    const firstDraft = await distributeCoursesIntoSemesters(topoSortedCourses, semesterPlans, programme)
    const finalDraft = distributeNonFacultyCoursesIntoSemesters(nonFacultyCourses, firstDraft)


    // res.status(200).json(generatedDraft);
    res.status(200).json(finalDraft);


  }catch(error){
    console.log("Error: ", error)
    res.status(500).json({ message: "Server error generating draft programme plan" , error: error.message});
  }

}

const sortByLevelThenType = (courses, typeOrder) => {
  return [...courses].sort((a, b) => {
    const levelA = a.study_level ?? 0;
    const levelB = b.study_level ?? 0;

    // 1. Sort by study level first
    if (levelA !== levelB) {
      return levelA - levelB;
    }

    // 2. If same level → sort by type
    const orderA = typeOrder.indexOf(a.type);
    const orderB = typeOrder.indexOf(b.type);

    return orderA - orderB;
  });
};


const topologicalSortCourses = async (courses, programme) => {
  const courseMap = {};
  const inDegree = {};
  const graph = {};

  // Initialize map
  courses.forEach((course) => {
    const id = course._id.toString();
    courseMap[id] = course;
    inDegree[id] = 0;
    graph[id] = [];
  });

  // Fetch missing prerequisite courses from DB if not in the list
  for (const course of courses) {
    const courseId = course._id.toString();
    let prereqs = course.prerequisites || [];

    const effectivePrereqObj = course.prerequisitesByProgramme?.find(prerequisiteObj => 
      prerequisiteObj.programme === programme._id.toString()
    )

    if(effectivePrereqObj && effectivePrereqObj.prerequisites?.length !== 0){
      prereqs = effectivePrereqObj.prerequisites
    }

    const prereqCourses = await Course.find({
      _id: { $in: prereqs }
    });


    for (const prereq of prereqCourses) {
      const prereqId = prereq._id?.toString() || prereq.toString();

      if (!graph[prereqId]) {
        // Not in original list, try fetch from DB
        // const missingCourse = await Course.findById(prereqId);
        // if (missingCourse) {
        //   courseMap[prereqId] = missingCourse;
        //   inDegree[prereqId] = 0;
        //   graph[prereqId] = [];
        // } else {
        //   console.warn(
        //     `⚠️ Prerequisite course with ID ${prereqId} not found in DB`
        //   );
        //   continue; // skip if not found
        // }
        throw new Error(`Prerequisites needed for course ${course.course_code} - ${course.course_name}`);
   
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

const distributeCoursesIntoSemesters = async (sortedCourses, semesterPlans, programme) => {
  if (!sortedCourses.length) return semesterPlans;

  const totalSemesters = semesterPlans.length;
  const courseSemesterMap = {}; // courseId -> semesterIndex
  let remainingCourses = [...sortedCourses];

  for(let i=0 ; i< totalSemesters;i++){
    const remainingSemesters = totalSemesters - i -1 ;
    const coursesLeft = remainingCourses.length;
    const currentSem = i % 2 === 0 ? 1 : 2

    let currentCourseIndex = 0
    let currentCount = semesterPlans[i].courses.length
    const target = Math.ceil(coursesLeft / remainingSemesters);

    while(currentCount < target && currentCourseIndex < remainingCourses.length){
      const course = remainingCourses[currentCourseIndex];
      const validSemesters = findValidSemester(course);

      const prereqIds = await getPrerequisiteCourseIds(course, programme);
      const currentSemesterCourseIds = semesterPlans[i].courses.map(c => c._id.toString());

      // Check if any prerequisite is in the current semester
      const hasPrereqInCurrentSemester = prereqIds.some(id => currentSemesterCourseIds.includes(id));
      if (hasPrereqInCurrentSemester) {
        // Skip this course for this semester
        currentCourseIndex++;
        continue;
      }

      if (isIndustrialTraining(course)) {
        // Remove IT from remainingCourses first
        remainingCourses.splice(currentCourseIndex, 1);

        // Remove all courses currently in this semester
        const coursesToReturn = semesterPlans[i].courses;
        // Put them back at the front to maintain topo order
        for (let j = coursesToReturn.length - 1; j >= 0; j--) {
          remainingCourses.unshift(coursesToReturn[j]);
        }

        // Reset current semester
        semesterPlans[i].courses = [];

        // Place IT in this semester
        semesterPlans[i].courses.push(course);
        courseSemesterMap[course._id.toString()] = i;

        // Lock this semester: skip adding more courses
        break;
      }


      // 2. academic project rule
      if(isAcademicProject2(course)){
        currentCourseIndex++;
        continue;
      }
      const apResult = handleAcademicProjects({
        course,
        semesterIndex: i,
        semesterPlans,
        remainingCourses,
        courseSemesterMap
      });
      if (apResult?.placed) {
        remainingCourses = apResult.updatedRemainingCourses;
        currentCount++;
        continue;
      }

      // Check if course can go in this semester
      if (validSemesters.includes(currentSem)) {
        semesterPlans[i].courses.push(course);
        courseSemesterMap[course._id.toString()] = i;

        remainingCourses.splice(currentCourseIndex, 1); // remove from remaining
        currentCount++;
        // j stays the same because we removed the element
      } else {
        currentCourseIndex++; // move to next course
      }
    }

  }

  return semesterPlans;
};

const distributeNonFacultyCoursesIntoSemesters = ( nonFacultyCourses, semesterPlans ) => {
  if (!nonFacultyCourses.length) return semesterPlans;

  const totalSemesters = semesterPlans.length;

  let i=0;
  while(nonFacultyCourses.length > 0){
    const semesterIndex = i % totalSemesters;
    if(semesterPlans[semesterIndex].courses.some(isIndustrialTraining)){
      i++;
      continue;
    }
    const course = nonFacultyCourses.shift();
    semesterPlans[semesterIndex].courses.push(course);
    i++;
  }

  return semesterPlans;
};

const findValidSemester = (course) => {
  const validSemesters = []
  for(const sem of course?.offered_semester){
    if(sem === SEMESTER_1){
      validSemesters.push(1)
    }else if(sem === SEMESTER_2){
      validSemesters.push(2)
    }else if(sem === SEMESTER_1_AND_2){
      validSemesters.push(1,2)
    }
  }

  return validSemesters
};

const isFacultyCourse = (course) =>
  FACULTY_COURSE_TYPES.includes(course.type);

const getPrerequisiteCourseIds = async (course, programme) => {
  let prereqs = course.prerequisites || [];

  const effectivePrereqObj = course.prerequisitesByProgramme?.find(
    p => p.programme_code === programme.programme_code
  );

  if (effectivePrereqObj?.prerequisite_codes?.length) {
    prereqs = effectivePrereqObj.prerequisite_codes;
    const prereqCourses = await Course.find({
      course_code : { $in: prereqs }
    }).select("_id");

  return prereqCourses.map(c => c._id.toString());
  }

  const prereqCourses = await Course.find({
    _id : { $in: prereqs }
  }).select("_id");

  return prereqCourses.map(c => c._id.toString());
};

const isAcademicProject1 = (course) => {
  return course.course_code === "WIA3002";

}

const isAcademicProject2 = (course) => {
  return course.course_code === "WIA3003";
}

const isIndustrialTraining = (course) => {
  return course.course_code === "WIA3001";
}

const handleAcademicProjects = ({
  course,
  semesterIndex,
  semesterPlans,
  remainingCourses,
  courseSemesterMap
}) => {
  // Only handle AP1
  if (!isAcademicProject1(course)) return null;

  const nextSemesterIndex = semesterIndex + 1;

  // Must have a next semester
  if (!semesterPlans[nextSemesterIndex]) return null;

  // Find AP2
  const ap2Index = remainingCourses.findIndex(isAcademicProject2);
  if (ap2Index === -1) {
    throw new Error("AP2 not found but AP1 exists");
  }

  const ap2 = remainingCourses[ap2Index];

  // Validate semester offering for AP2
  const nextSemNumber = nextSemesterIndex % 2 === 0 ? 1 : 2;
  const ap2ValidSemesters = findValidSemester(ap2);

  if (!ap2ValidSemesters.includes(nextSemNumber)) {
    return null;
  }

  /* -----------------------------
     PLACE AP1 & AP2
  ------------------------------*/
  semesterPlans[semesterIndex].courses.push(course);
  courseSemesterMap[course._id.toString()] = semesterIndex;

  semesterPlans[nextSemesterIndex].courses.push(ap2);
  courseSemesterMap[ap2._id.toString()] = nextSemesterIndex;

  const updatedRemainingCourses = remainingCourses.filter(
    c =>
      ![
        course._id.toString(),
        ap2._id.toString()
      ].includes(c._id.toString())
  );

  return {
    updatedRemainingCourses,
    placed: true
  };
};

module.exports = {
  getProgrammePlans,
  getProgrammePlanById,
  editProgrammePlan,
  generateDraftProgrammePlan
};
