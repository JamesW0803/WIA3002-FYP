export const toUICourse = (c = {}) => ({
  _id: c._id || c.course?._id,
  code: c.code || c.course_code || c.course?.course_code || "",
  name: c.name || c.title_at_time || c.course?.course_name || "",
  credit: c.course?.credit_hours ?? c.credit ?? c.credit_at_time ?? 0,
  prerequisites: Array.isArray(c.prerequisites)
    ? c.prerequisites
    : Array.isArray(c.course?.prerequisites)
    ? c.course.prerequisites.map((p) => p.course_code ?? p)
    : [],
  offered_semester: c.offered_semester || c.course?.offered_semester || [],
});

export const normalizePlanForUI = (plan) => ({
  ...plan,
  id: plan._id || plan.id || plan.identifier,
  years: (plan.years || []).map((y) => ({
    ...y,
    isGapYear: y.isGapYear || false,
    semesters: (y.semesters || []).map((s) => ({
      ...s,
      isGap: s.isGap || false,
      courses: (s.courses || []).map(toUICourse),
    })),
  })),
});
