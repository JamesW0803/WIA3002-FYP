export const gradePointsMap = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  F: 0.0,
};

export const calculateSemesterGPA = (courses) => {
  let totalCredits = 0;
  let totalPoints = 0;

  courses.forEach(({ credit, grade }) => {
    const creditVal = parseFloat(credit);
    const point = gradePointsMap[grade];
    if (!isNaN(creditVal)) {
      totalCredits += creditVal;
      totalPoints += creditVal * (point || 0);
    }
  });

  return totalCredits === 0 ? "0.00" : (totalPoints / totalCredits).toFixed(2);
};

export const calculateProjectedGPA = (
  currentGPA,
  completedCredits,
  plannedCourses
) => {
  if (!currentGPA || !completedCredits || !plannedCourses?.length)
    return "0.00";

  const currentPoints = parseFloat(currentGPA) * parseFloat(completedCredits);
  let newPoints = 0;
  let newCredits = 0;

  plannedCourses.forEach(({ credit, grade }) => {
    const creditVal = parseFloat(credit);
    const point = gradePointsMap[grade];
    if (!isNaN(creditVal)) {
      newCredits += creditVal;
      newPoints += creditVal * (point || 0);
    }
  });

  if (newCredits === 0) return "0.00";

  const totalPoints = currentPoints + newPoints;
  const totalCredits = parseFloat(completedCredits) + newCredits;
  return (totalPoints / totalCredits).toFixed(2);
};

export const calculateRequiredGPA = (
  currentGPA,
  completedCredits,
  targetGPA,
  plannedCredits
) => {
  if (!currentGPA || !completedCredits || !targetGPA || !plannedCredits) {
    return { requiredGPA: null, isPossible: false };
  }

  const currentPoints = parseFloat(currentGPA) * parseFloat(completedCredits);
  const totalCredits =
    parseFloat(completedCredits) + parseFloat(plannedCredits);
  const requiredPoints = parseFloat(targetGPA) * totalCredits - currentPoints;
  const requiredGPA = requiredPoints / parseFloat(plannedCredits);

  return {
    requiredGPA: requiredGPA.toFixed(2),
    isPossible: requiredGPA <= 4.0,
  };
};

export const calculateTotalCredits = (courses) => {
  return courses.reduce((total, course) => {
    const credit = parseFloat(course.credit);
    return total + (isNaN(credit) ? 0 : credit);
  }, 0);
};
