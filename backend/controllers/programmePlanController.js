const Student = require("../models/Student");
const ProgrammePlan = require("../models/ProgrammePlan");
const SemesterPlan = require("../models/SemesterPlan");
const Course = require("../models/Course");
const AcademicSession = require("../models/AcademicSession");
const { TYPE_PRIORITY } = require("../constants/courseType")
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
    res.status(500).json({ message: "Internal server error" });
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
    const { graduation_requirements, programme_plan } = req.body

    const semesterPlans = programme_plan?.semester_plans
    const allocatedCourseCodes = semesterPlans.flatMap(semesterPlan => 
      semesterPlan.courses.map(course => course.course_code))
    const remainingCourses = graduation_requirements.filter((course) => !allocatedCourseCodes.includes(course.course_code))
    
    const sortedCourses = sortByLevelThenType(remainingCourses, TYPE_PRIORITY)
    const topoSortedCourses = await topologicalSortCourses(sortedCourses)
    const generatedDraft = distributeCoursesIntoSemesters(topoSortedCourses, semesterPlans)
    

    res.status(200).json(generatedDraft);

  }catch(error){
    console.log("Error: ", error)
    res.status(500).json({ message: "Server error generating draft programme plan" })
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


const topologicalSortCourses = async (courses) => {
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
          console.warn(
            `⚠️ Prerequisite course with ID ${prereqId} not found in DB`
          );
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

const distributeCoursesIntoSemesters = (sortedCourses, semesterPlans) => {
  if (!sortedCourses.length) return semesterPlans;

  const totalSemesters = semesterPlans.length;

  let remainingCourses = [...sortedCourses];

  for(let i=0 ; i< totalSemesters;i++){
    const remainingSemesters = totalSemesters - i ;
    const coursesLeft = remainingCourses.length;
    const currentSem = i % 2 === 0 ? 1 : 2
    let currentCourseIndex = 0
    let currentCount = semesterPlans[i].courses.length

    const target = Math.ceil(coursesLeft / remainingSemesters);

    while(currentCount < target && currentCourseIndex < remainingCourses.length){
      const course = remainingCourses[currentCourseIndex];
      const validSemesters = findValidSemester(course);

      
      // Check if course can go in this semester
      if (validSemesters.includes(currentSem)) {
        semesterPlans[i].courses.push(course);
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


module.exports = {
  getProgrammePlans,
  getProgrammePlanById,
  editProgrammePlan,
  generateDraftProgrammePlan
};
