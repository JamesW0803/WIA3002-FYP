import StatusBadge from "../../components/Faculty/StatusBadge";
import { studentDetailFields } from "../../constants/studentDetailsFormConfig"

// Display table container
const StudentDetailsDisplayTable = ({ leftEntries, rightEntries }) => (
  <div className="w-full max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
    <StudentDetailsDisplayColumn entries={leftEntries} />
    <StudentDetailsDisplayColumn entries={rightEntries} />
  </div>
);

// Column component
const StudentDetailsDisplayColumn = ({ entries }) => (
  <div className="flex flex-col gap-4">
    {entries.map(([key, value]) => {
      const field = studentDetailFields.find((f) => f.key === key);
      if (!field) return null;

      const isStatusField = key.toLowerCase() === "status";

      return (
        <StudentInfoField
          key={key}
          icon={field.icon}
          label={field.label}
          value={
            isStatusField ? <StatusBadge status={value.status} notes={value.status_notes} /> : value
          }
        />
      );
    })}
  </div>
);

// Individual field component with refined style
const StudentInfoField = ({ icon: Icon, label, value }) => (
  // <div className="flex items-start gap-3 p-3 rounded-lg bg-white shadow-sm border border-gray-100">
  <div className="flex items-start gap-3 p-3 rounded-lg bg-white"> {/* without border and shadow*/}
    {Icon && <Icon className="text-gray-400 flex-shrink-0 mt-1" size={18} />}
    <div className="flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

export default StudentDetailsDisplayTable;