export const getEffectiveTypeForProgramme = (course, programmeName) => {
  if (!course) return undefined;
  if (!course.typesByProgramme) return course.type;

  const cfg = course.typesByProgramme.find(
    (t) =>  (t.programme_name ?? t.programme.programme_name) === programmeName
  );

  return cfg ? cfg.type : course.type;
};