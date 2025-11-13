import React, { useMemo } from "react";
import SelectMenu from "./SelectMenu";

const CourseStatusSelector = ({ status, onChange, allowedStatuses = [] }) => {
  const options = useMemo(() => {
    const order = ["Planned", "Ongoing", "Passed", "Failed"];
    return order
      .filter((s) => allowedStatuses.includes(s))
      .map((s) => ({ value: s, label: s }));
  }, [allowedStatuses]);

  return (
    <SelectMenu
      value={status || null}
      onChange={onChange}
      options={options}
      placeholder="Select Status"
      searchable={false} // not necessary for 1–3 options, but can set to true if you want
      ariaLabel="Course status"
    />
  );
};

export default CourseStatusSelector;
