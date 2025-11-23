import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Edit2,
  Save,
  X,
} from "lucide-react";

import GeneralCardHeader from "../../../components/Faculty/GeneralCardHeader";
import axiosClient from "../../../api/axiosClient";
import { READABLE_COURSE_TYPES } from "../../../constants/courseType";

import { formSessions } from "../../../constants/courseFormConfig";

const CourseDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const course_code = location.state.course_code;
  const [editMode, setEditMode] = useState(location.state?.editMode || false);
  const [formData, setFormData] = useState({});
  const [courses, setCourses] = useState([]);

  // ----------------------------------------
  // LOAD COURSE DETAILS
  // ----------------------------------------
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await axiosClient.get(`/courses/${course_code}`);
        const course = res.data;

        // Flatten prerequisites
        if (course.prerequisites?.length > 0) {
          course.prerequisites = course.prerequisites[0].course_code;
        }

        setFormData(course);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchAllCourses = async () => {
      try {
        const res = await axiosClient.get("/courses");
        setCourses(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCourse();
    fetchAllCourses();
  }, [course_code]);


  // ----------------------------------------
  // HANDLERS
  // ----------------------------------------
  const handleBack = () => navigate("/admin/courses");
  const handleCancel = () => setEditMode(false);
  const handleEdit = () => setEditMode(true);

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        prerequisites: formData.prerequisites
          ? [formData.prerequisites]
          : [],
      };

      await axiosClient.put(`/courses/${formData.course_code}`, payload);
      setEditMode(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (key) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };


  // ----------------------------------------
  // Inject prerequisite course options dynamically
  // ----------------------------------------
  const processedSessions = formSessions.map((session) => ({
    ...session,
    fields: session.fields.map((f) => {
      if (f.key === "prerequisites") {
        return {
          ...f,
          options: courses.map((c) => ({
            label: `${c.course_code} - ${c.course_name}`,
            value: c.course_code,
          })),
        };
      }
      return f;
    }),
  }));


  // ----------------------------------------
  // Render helpers
  // ----------------------------------------
  const renderField = (field) => {
    const {
      key,
      label,
      icon: Icon,
      type,
      multiline,
      options,
      placeholder,
    } = field;

    const value = key == "type" ? READABLE_COURSE_TYPES[formData[key]] : formData[key] ?? "";

    return (
      <CourseInfoField
        key={key}
        icon={Icon ? <Icon size={18} /> : null}
        label={label}
        value={value}
        editMode={editMode}
        type={type}
        multiline={multiline}
        options={options}
        placeholder={placeholder}
        onChange={handleInputChange(key)}
      />
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <GeneralCardHeader handleBack={handleBack} title={"Back to Courses"} />

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* HEADER BAR */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{formData.course_name}</h1>
              <div className="text-sm bg-white/20 px-3 py-1 rounded-lg inline-block mt-2">
                {formData.course_code}
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


          {/* CONTENT */}
          <div className="p-8 space-y-12 bg-white">

            {processedSessions.map((session) => (
              <div key={session.title}>
                <h2 className="text-lg font-bold text-gray-700 mb-4">
                  {session.title}
                </h2>

                {/* GRID LAYOUT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {session.fields.map(renderField)}
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
};


// =========================================================
// Reusable Dynamic Field Component
// =========================================================
const CourseInfoField = ({
  icon,
  label,
  value,
  editMode,
  type,
  multiline,
  options,
  placeholder,
  onChange,
}) => {
  return (
    <div className="flex items-start mb-3">
      {icon && <div className="mr-3 mt-1 text-gray-400">{icon}</div>}

      <div className="w-full">
        <p className="text-sm text-gray-500 mb-1">{label}</p>

        {editMode ? (
          type === "select" ? (
            <select
              className="border border-gray-300 rounded-lg p-2 w-full text-sm"
              value={value}
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
              placeholder={placeholder}
              className="border border-gray-300 rounded-lg p-2 w-full text-sm resize-none"
              value={value}
              onChange={onChange}

            />
          )
        ) : (
          <p className="font-semibold text-sm text-gray-900 whitespace-pre-line">
            {value || "-"}
          </p>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;
