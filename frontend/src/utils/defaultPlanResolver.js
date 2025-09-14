/**
 * Build a quick lookup: course_code -> course object
 * @param {Array} allCourses - API /courses response (full version)
 * @returns {Map<string, object>}
 */
export function buildCourseIndex(allCourses = []) {
  const idx = new Map();
  for (const c of allCourses) {
    if (c?.course_code) idx.set(c.course_code, c);
  }
  return idx;
}

/**
 * Resolve semesterMapping to UI-friendly structure with real course objects.
 * - Non-specialization codes are looked up from allCourses.
 * - SPECIALIZATION_* become a standardized "programme_elective" placeholder.
 *
 * @param {object} semesterMapping - your constants/semesterMapping.js
 * @param {Array} allCourses - /courses response (full, not minimal)
 * @param {object} [opts]
 * @param {number} [opts.electiveCreditHours=3] - default credit for elective placeholder
 * @param {string} [opts.electiveLabel='Specialization Elective'] - label for placeholder
 * @returns {{
 *   years: Array<{
 *     year: string,
 *     semesters: Array<{
 *       name: string,
 *       totalCredits: number,
 *       courses: Array<{
 *         course_code: string,
 *         course_name: string,
 *         credit_hours: number,
 *         type: string,
 *         placeholder?: boolean
 *       }>
 *     }>
 *   }>,
 *   missingCodes: string[]
 * }}
 */
export function resolveDefaultPlanCourses(
  semesterMapping,
  allCourses,
  opts = {}
) {
  const { electiveCreditHours = 3, electiveLabel = "Specialization Elective" } =
    opts;

  const SPECIALIZATION_PREFIX = "SPECIALIZATION_";
  const courseIndex = buildCourseIndex(allCourses);
  const missingCodes = [];

  const years = Object.entries(semesterMapping).map(([year, semesters]) => {
    const semBlocks = Object.entries(semesters).map(([semName, codes]) => {
      let specializationCount = 1;

      const courses = codes
        .map((code) => {
          // Handle SPECIALIZATION placeholders
          if (String(code).startsWith(SPECIALIZATION_PREFIX)) {
            return {
              course_code: "SPECIALIZATION",
              course_name: `${electiveLabel} (${specializationCount++})`,
              credit_hours: electiveCreditHours,
              type: "programme_elective",
              placeholder: true,
            };
          }

          // Real course lookup by course_code
          const found = courseIndex.get(code);
          if (!found) {
            missingCodes.push(code);
            // Keep a visible stub so the UI reflects the intended default plan
            return {
              course_code: code,
              course_name: "Unknown Course",
              credit_hours: electiveCreditHours,
              type: "programme_core",
              placeholder: true,
            };
          }

          // Pick only what the UI needs (avoid accidental mutation)
          return {
            course_code: found.course_code,
            course_name: found.course_name,
            credit_hours: found.credit_hours,
            type: found.type,
          };
        })
        .filter(Boolean);

      const totalCredits = courses.reduce(
        (sum, c) => sum + (c.credit_hours || 0),
        0
      );

      return {
        name: semName,
        totalCredits,
        courses,
      };
    });

    return {
      year,
      semesters: semBlocks,
    };
  });

  return { years, missingCodes };
}
