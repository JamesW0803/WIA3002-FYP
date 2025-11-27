import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Edit2, Save, X, Trash } from "lucide-react";
import GeneralCardHeader from "../../../components/Faculty/GeneralCardHeader";
import axiosClient from "../../../api/axiosClient";
import { formSessions } from "../../../constants/courseFormConfig";
import { READABLE_COURSE_TYPES } from "../../../constants/courseType";
import PrerequisitesSession from "../../../components/Faculty/Courses/PrerequisitesSession";
import ProgrammePrerequisitesSession from "../../../components/Faculty/Courses/ProgrammePrerequisitesSession";
import FormDialog from "../../../components/dialog/FormDialog";
import Notification from "../../../components/Students/AcademicProfile/Notification";
import { useAcademicProfile } from "../../../hooks/useAcademicProfile";

const CourseDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const course_code = location.state.course_code;
  const addCourse = location.state?.addCourse || false;
  const [editMode, setEditMode] = useState(location.state?.editMode || false);
  const [formData, setFormData] = useState({});
  const [originalFormData, setOriginalFormData] = useState({});
  const [openDialog, setOpenDialog] = useState(false);

  const [courses, setCourses] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { 
      showNotification , 
      closeNotification,
      notification,
  } = useAcademicProfile()

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await axiosClient.get(`/courses/${course_code}`);
        const course = res.data;
        setFormData(course);
        setOriginalFormData(course);
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

    // NEW
    const fetchProgrammes = async () => {
      try {
        const res = await axiosClient.get("/programmes");
        setProgrammes(res.data);
      } catch (err) {
        console.error("Error fetching programmes: ", err);
      }
    };

    const run = async () => {
      try {
        if (!addCourse) {
          await fetchCourse();
        } else {
          setEditMode(location.state?.editMode ? true : false);
          setFormData({
            course_code: "",
            course_name: "",
            type: "",
            credit_hours: "",
            offered_semester: [],
            prerequisites: [],
            prerequisitesByProgramme: [],
            description: "",
            study_level: "",
            department: "",
            faculty: "",
          });
        }

        await fetchAllCourses();
        await fetchProgrammes();
      } finally {
        setLoading(false);
      }
    };
    console.log("editMode: ", editMode)
    console.log("addCourse: ", addCourse)

    run();
  }, [course_code]);

  const handleBack = () => navigate("/admin/courses");

  const handleCancel = () => {
    if (addCourse) {
      navigate("/admin/courses");
    }
    setEditMode(false);
    setFormData(originalFormData);
  };

  const handleEdit = () => setEditMode(true);

  const handleDelete = () => {
    setOpenDialog(true);
  };

  const confirmDeleteCourse = async () => {
    try {
      await axiosClient.delete(`/courses/${formData.course_code}`);
      navigate("/admin/courses", {
        state: {
          notificationMessage: "Course is removed successfully",
          notificationType: "success"
        }
      });
    } catch (error) {
      showNotification("Error removing course", "error")
    } 
  };

  const handleSave = async () => {
    let branch = ""
    try {
      // normalize offered_semester just like AddCourse
      let offered_semester = formData.offered_semester;

      if (!Array.isArray(offered_semester)) {
        if (offered_semester === "Semester 1 & 2") {
          offered_semester = ["Semester 1", "Semester 2"];
        } else if (offered_semester) {
          offered_semester = [offered_semester];
        } else {
          offered_semester = [];
        }
      } else {
        offered_semester = offered_semester.flatMap((sem) => {
          if (sem === "Semester 1 & 2") return ["Semester 1", "Semester 2"];
          return [sem];
        });
      }

      const payload = {
        ...formData,
        offered_semester,
        prerequisites: (formData.prerequisites || []).filter(Boolean),
        prerequisitesByProgramme: (formData.prerequisitesByProgramme || [])
          .filter(
            (cfg) =>
              cfg.programme_code && (cfg.prerequisite_codes || []).length > 0
          )
          .map((cfg) => ({
            programme_code: cfg.programme_code,
            prerequisite_codes: (cfg.prerequisite_codes || []).filter(Boolean),
          })),
      };
      if (!addCourse) {
        branch = "update"
        const res = await axiosClient.put(
          `/courses/${formData.course_code}`,
          payload
        );
        showNotification("Course is updated successfully", "success")
        setFormData(res.data);
        setOriginalFormData(res.data);
        setEditMode(false)
      } else {
        branch = "oncreate"
        const res = await axiosClient.post(`/courses`, payload);
        const savedCourse = res.data;
        showNotification("Course is created successfully", "success")
        setEditMode(false)
        navigate(`/admin/courses/${savedCourse.course_code}`, {
          state: {
            course_code: savedCourse.course_code,
            editMode: false,
            courses,
            addCourse: false
          },
        });
      }
      
    } catch (err) {
      showNotification(`Error ${branch === "update" ? "updating" : "creating"} course` , "error")
      console.error(err);
    }
  };

  const handleInputChange = (key) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const processedSessions = formSessions.filter(
    (session) => session.title !== "Prerequisites"
  );

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

    return (
      <CourseInfoField
        fieldKey={key}
        icon={Icon ? <Icon size={18} /> : null}
        label={label}
        value={formData[key]}
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
          {loading ? (
            <>
              <SkeletonHeader />

              <div className="p-8 space-y-12 bg-white">
                <SkeletonSection />
                <SkeletonSection />
              </div>
            </>
          ) : (
            <>
              {/* ORIGINAL HEADER BAR */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">
                    {formData.course_name || "--Add New Course--"}
                  </h1>
                  <div className="text-sm bg-white/20 px-3 py-1 rounded-lg inline-block mt-2 mr-2">
                    {formData.course_code || "new_course_code"}
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
                    <>
                      <button
                        onClick={handleEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      {!addCourse && (
                        <button
                          onClick={handleDelete}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                        >
                          <Trash size={16} /> Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <FormDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                onConfirm={confirmDeleteCourse}
                title="Delete Course"
                content={`Are you sure you want to delete course ${formData.course_name} with code "${formData.course_code}"?`}
                confirmText="Delete"
                cancelText="Cancel"
              />

              {/* ORIGINAL CONTENT */}
              <div className="p-8 space-y-12 bg-white">
                {processedSessions.map((session) => (
                  <div key={session.title}>
                    <h2 className="text-lg font-bold text-gray-700 mb-4">
                      {session.title}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {session.fields.map(renderField)}
                    </div>
                  </div>
                ))}
                <PrerequisitesSession
                  courses={courses}
                  formData={formData}
                  setFormData={setFormData}
                  editMode={editMode}
                />

                <ProgrammePrerequisitesSession
                  programmes={programmes}
                  courses={courses}
                  formData={formData}
                  setFormData={setFormData}
                  editMode={editMode}
                />
              </div>
            </>
          )}
        </div>

        {notification.show && (
          <Notification
              message={notification.message}
              type={notification.type}
              isClosing={notification.isClosing}
              onClose={closeNotification}
          />
        )}
      </div>
    </div>
  );
};

const CourseInfoField = ({
  fieldKey,
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
  let displayValue = value ?? "-";
  if (fieldKey == "type") {
    displayValue = READABLE_COURSE_TYPES[value] || "-";
  }
  if (fieldKey == "offered_semester" && Array.isArray(value)) {
    displayValue = value.length > 0 ? value.join(", ") : "-";
  }

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
            {displayValue ?? "-"}
          </p>
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

export default CourseDetails;
