import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Edit2, Save, X } from "lucide-react";

import GeneralCardHeader from "../../../components/Faculty/GeneralCardHeader";
import axiosClient from "../../../api/axiosClient";
import { programmeIntakeFormFields } from "../../../constants/programmeIntakeFormConfig";
import { formatDateToLocaleString } from "../../../utils/dateFormatter";

import GraduationRequirement from "../../../components/Faculty/GraduationRequirement";
import CoursePlan from "../../../components/Faculty/CoursePlan";

const ProgrammeEnrollmentDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { programme_intake_code } = useParams();

  const [editMode, setEditMode] = useState(location.state?.editMode || false);
  const [formData, setFormData] = useState({});
  const [graduationRequirements, setGraduationRequirements] = useState([]);
  const [activeTab, setActiveTab] = useState("graduation-requirement");
  const [ loading, setLoading] = useState(true);

  // ----------------------------------------
  // LOAD PROGRAMME ENROLLMENT DETAILS
  // ----------------------------------------
  useEffect(() => {
    const fetchProgrammeEnrollment = async () => {
      try {
        const res = await axiosClient.get(`/programme-intakes/${programme_intake_code}`);
        const data = {
          ...res.data,
          createdAt: formatDateToLocaleString(res.data.createdAt),
          updatedAt: formatDateToLocaleString(res.data.updatedAt),
        };
        setFormData(data);
        setGraduationRequirements(data.graduation_requirements || []);
      } catch (err) {
        console.error(err);
      }finally{
        setLoading(false);
      }
    };
    fetchProgrammeEnrollment();
  }, [programme_intake_code]);

  // ----------------------------------------
  // HANDLERS
  // ----------------------------------------
  const handleBack = () => navigate("/admin/programme-intakes");
  const handleCancel = () => setEditMode(false);
  const handleEdit = () => setEditMode(true);
  const handleSave = async () => {
    try {
      await axiosClient.put(`/programme-intakes/${formData.programme_intake_code}`, formData);
      setEditMode(false);
    } catch (err) {
      console.error("Error saving programme enrollment:", err);
    }
  };
  const handleInputChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  // ----------------------------------------
  // SPLIT FORM DATA INTO TWO COLUMNS
  // ----------------------------------------
  const allowedKeys = programmeIntakeFormFields.map((f) => f.key);
  const entries = Object.entries(formData).filter(([key]) => allowedKeys.includes(key));
  const mid = Math.ceil(entries.length / 2);
  const leftEntries = entries.slice(0, mid);
  const rightEntries = entries.slice(mid);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <GeneralCardHeader handleBack={handleBack} title="Back to Programme Intakes" />

          {loading ? (
            <>
              <SkeletonHeader />

              <div className="p-8 space-y-12 bg-white">
                <SkeletonSection />
                <SkeletonSection />
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* HEADER */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{formData.programme_intake_code || "-"}</h1>
                    <div className="text-sm bg-white/20 px-3 py-1 rounded-lg inline-block mt-2 mr-2">
                        {formData.programme_name || "-"}
                    </div>
                    <div className="text-sm bg-white/20 px-3 py-1 rounded-lg inline-block mt-2 ml-2">
                        {`${formData.academic_session?.year}-${formData.academic_session?.semester}` || "-"}
                    </div>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  {editMode ? (
                    <>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
                      >
                        <X size={16} /> Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg"
                      >
                        <Save size={16} /> Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                  )}
                </div>
              </div>

              {/* FORM CONTENT */}
              <div className="p-8 space-y-12 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {leftEntries.map(([key, value]) => (
                    <FormField
                      key={key}
                      field={programmeIntakeFormFields.find((f) => f.key === key)}
                      value={value}
                      editMode={editMode}
                      onChange={handleInputChange(key)}
                    />
                  ))}
                  {rightEntries.map(([key, value]) => (
                    <FormField
                      key={key}
                      field={programmeIntakeFormFields.find((f) => f.key === key)}
                      value={value}
                      editMode={editMode}
                      onChange={handleInputChange(key)}
                    />
                  ))}
                </div>
              </div>

              {/* TABS */}
              <div className="flex gap-4 border-b border-gray-200 px-8">
                <button
                  className={`pb-2 text-sm font-medium ${
                    activeTab === "graduation-requirement"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("graduation-requirement")}
                >
                  Graduation Requirement
                </button>
                <button
                  className={`pb-2 text-sm font-medium ${
                    activeTab === "course-plan"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab("course-plan")}
                >
                  Course Plan
                </button>
              </div>

              {/* TAB CONTENT */}
              <div className="p-8">
                {activeTab === "graduation-requirement" && (
                  <GraduationRequirement graduationRequirements={graduationRequirements} />
                )}
                {activeTab === "course-plan" && (
                  <CoursePlan programmeEnrollment={formData} />
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

// =========================================================
// FORM FIELD COMPONENT
// =========================================================
const FormField = ({ field, value, editMode, onChange }) => {
  if (!field) return null;
  const { label, icon: Icon, type, multiline, options, placeholder } = field;

  return (
    <div className="flex items-start mb-3">
      {Icon && <div className="mr-3 mt-1 text-gray-400">{<Icon size={18} />}</div>}
      <div className="w-full">
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        {editMode ? (
          type === "select" ? (
            <select
              className="border border-gray-300 rounded-lg p-2 w-full text-sm"
              value={value || ""}
              onChange={onChange}
            >
              <option value="">-- Select --</option>
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              rows={multiline ? 3 : 1}
              className="border border-gray-300 rounded-lg p-2 w-full text-sm resize-none"
              placeholder={placeholder || ""}
              value={value || ""}
              onChange={onChange}
            />
          )
        ) : (
          <p className="text-sm font-semibold text-gray-900 whitespace-pre-line">{value || "-"}</p>
        )}
      </div>
    </div>
  );
};

const SkeletonHeader = () => (
  <div className="animate-pulse bg-gradient-to-r from-blue-600 to-blue-700 p-8">
    <div className="h-6 w-48 bg-white/30 rounded mb-3"></div>
    <div className="h-4 w-24 bg-white/30 rounded"></div>
  </div>
);

const SkeletonField = () => (
  <div className="flex items-start mb-3 animate-pulse">
    <div className="mr-3 mt-1 w-5 h-5 bg-gray-300 rounded"></div>
    <div className="w-full">
      <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
      <div className="h-8 w-full bg-gray-200 rounded"></div>
    </div>
  </div>
);

const SkeletonSection = () => (
  <div className="space-y-6">
    <div className="h-5 w-40 bg-gray-300 rounded"></div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <SkeletonField />
      <SkeletonField />
      <SkeletonField />
      <SkeletonField />
    </div>
  </div>
);


export default ProgrammeEnrollmentDetails;
