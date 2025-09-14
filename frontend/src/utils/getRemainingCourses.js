export default function getRemainingCourses(allCourses, completedEntries) {
  const courseStatusMap = new Map();

  completedEntries.forEach((entry) => {
    const code = entry.course.course_code;
    const existing = courseStatusMap.get(code);

    if (
      !existing ||
      entry.year > existing.year ||
      (entry.year === existing.year && entry.semester > existing.semester)
    ) {
      courseStatusMap.set(code, {
        status: entry.status,
        year: entry.year,
        semester: entry.semester,
      });
    }
  });

  const passedCourses = new Set();
  courseStatusMap.forEach((status, code) => {
    if (status.status === "Passed") passedCourses.add(code);
  });

  const transformPrerequisites = (prereqs) => {
    return prereqs
      .map((item) => {
        if (typeof item === "string") {
          // Treat as ID → lookup
          const course = allCourses.find((c) => c._id === item);
          return course
            ? {
                course_code: course.course_code,
                course_name: course.course_name,
                credit_hours: course.credit_hours,
              }
            : null;
        } else if (typeof item === "object" && item.course_code) {
          // Already a full object → just extract info
          return {
            course_code: item.course_code,
            course_name: item.course_name,
            credit_hours: item.credit_hours,
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const remainingCourses = allCourses
    .filter((course) => {
      const status = courseStatusMap.get(course.course_code);
      return (
        (!status || status.status === "Failed") &&
        course.course_code !== "GLT1049"
      );
    })
    .map((course) => ({
      ...course,
      prerequisites: transformPrerequisites(course.prerequisites || []),
    }));

  const specialCodes = ["WIA3001", "WIA3002", "WIA3003"];
  specialCodes.forEach((code) => {
    if (
      !remainingCourses.find((c) => c.course_code === code) &&
      !passedCourses.has(code)
    ) {
      const courseObj = allCourses.find((c) => c.course_code === code);
      if (courseObj) {
        remainingCourses.push({
          ...courseObj,
          prerequisites: transformPrerequisites(courseObj.prerequisites || []),
        });
      }
    }
  });

  const she4Passed = passedCourses.has("SHE4444");
  const kiarPassed = passedCourses.has("GQX0056");
  return remainingCourses.filter((c) => {
    if (c.course_code === "SHE4444") return !kiarPassed; // hide SHE4 if KIAR already passed
    if (c.course_code === "GQX0056") return !she4Passed; // hide KIAR if SHE4 already passed
    return true;
  });
}
