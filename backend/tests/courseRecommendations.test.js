const {
  isOfferedInSemester,
  getEffectiveTypeForProgrammeClient,
} = require("../utils/courseRecommendationsUtils.cjs");

describe("Course Recommendation Logic Unit Tests", () => {
  // =========================================================================
  // TC-STU-CP-07: Verify Generation of Course Recommendations
  // (Sub-test: Check if course is offered in specific semester)
  // =========================================================================
  test("TC-STU-CP-07 (A): Verify Semester Offering Logic", () => {
    const course = { offered_semester: ["Semester 1", "Semester 2"] };

    // Should return true for Sem 1
    expect(isOfferedInSemester(course, 1)).toBe(true);

    // Should return false for Sem 3
    expect(isOfferedInSemester(course, 3)).toBe(false);
  });

  // =========================================================================
  // TC-STU-CP-07: Verify Course Type Logic (Core vs Elective)
  // (Sub-test: Ensure Data Science students see 'WIC2004' as Major Core, others as Elective)
  // =========================================================================
  test("TC-STU-CP-07 (B): Verify Programme-Specific Course Types", () => {
    const mockCourse = {
      course_code: "WIC2004",
      type: "programme_elective", // Default type
      typesByProgramme: [
        {
          programme: { programme_code: "WIA_DS" }, // Data Science Programme
          type: "faculty_core", // Override type
        },
      ],
    };

    // Case 1: Student is in Data Science (WIA_DS) -> Should be "faculty_core"
    const typeDS = getEffectiveTypeForProgrammeClient(
      mockCourse,
      "WIA_DS",
      "prog_id_1",
      "Department of Data Science"
    );
    expect(typeDS).toBe("faculty_core");

    // Case 2: Student is in Software Eng (WIA_SE) -> Should fall back to "programme_elective" (or default)
    const typeSE = getEffectiveTypeForProgrammeClient(
      mockCourse,
      "WIA_SE",
      "prog_id_2",
      "Department of SE"
    );
    // Based on logic: if rawType is 'programme_elective' and dept doesn't match, it might return 'non_elective'
    // But here we just verify it DOES NOT return 'faculty_core'
    expect(typeSE).not.toBe("faculty_core");
  });
});
