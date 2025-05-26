import React from "react";
import { NotebookPen } from "lucide-react";

const GPATipsSection = () => (
  <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
    <h4 className="font-medium text-[#1E3A8A] mb-2 flex items-center gap-2">
      <NotebookPen className="w-4 h-4" />
      Tips for GPA Improvement:
    </h4>
    <ul className="list-disc pl-5 text-gray-700 space-y-1">
      <li>
        Prioritize courses with higher credit values - they impact your GPA more
      </li>
      <li>Balance difficult courses with easier ones each semester</li>
      <li>
        Use the simulation to see how different grade combinations affect your
        GPA
      </li>
      <li>
        Focus on maintaining consistent grades rather than occasional high
        grades
      </li>
    </ul>
  </div>
);

export default GPATipsSection;
