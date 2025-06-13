import React from "react";
import { Input } from "../../../ui/input";
import { Textarea } from "../../../ui/textarea";

const PlanHeaderForm = ({
  planTitle,
  setPlanTitle,
  planNotes,
  setPlanNotes,
}) => {
  return (
    <div className="mb-6 space-y-4">
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Forecast Title <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="e.g. 'GPA Booster'"
          value={planTitle}
          onChange={(e) => setPlanTitle(e.target.value)}
        />
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <Textarea
          placeholder="Add any notes about this forecast..."
          value={planNotes}
          onChange={(e) => setPlanNotes(e.target.value)}
          rows={1}
        />
      </div>
    </div>
  );
};

export default PlanHeaderForm;
