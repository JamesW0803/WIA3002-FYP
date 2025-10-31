import React, { useMemo } from "react";
import SelectMenu from "./SelectMenu";

const GradeSelector = ({ status, grade, onChange, gradeOptions }) => {
  const opts = useMemo(() => {
    if (!status) return [];
    const list =
      status === "Passed" ? gradeOptions.passed : gradeOptions.failed;
    return list.map((g) => ({ value: g, label: g }));
  }, [status, gradeOptions]);

  return (
    <SelectMenu
      value={grade || null}
      onChange={onChange}
      options={opts}
      placeholder="Select grade"
      searchable={false}
      ariaLabel="Grade"
    />
  );
};

export default GradeSelector;
