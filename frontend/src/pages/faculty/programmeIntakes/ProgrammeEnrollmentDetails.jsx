import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Edit2, Save, X, Trash } from "lucide-react";
import GeneralCardHeader from "../../../components/Faculty/GeneralCardHeader";
import axiosClient from "../../../api/axiosClient";
import { programmeIntakeFormFields } from "../../../constants/programmeIntakeFormConfig";
import { formatDateToLocaleString } from "../../../utils/dateFormatter";
import GraduationRequirement from "../../../components/Faculty/GraduationRequirement";
import CoursePlan from "../../../components/Faculty/CoursePlan";
import FormDialog from "../../../components/dialog/FormDialog"
import { generateProgrammeIntakeCode } from "../../../utils/programmeIntakeCodeGenerator";

const ProgrammeEnrollmentDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { programme_intake_code } = useParams();

  const addProgrammeIntake = location.state?.addProgrammeIntake || false;
  const [originalFormData, setOriginalFormData] = useState({});
  const [ editMode, setEditMode] = useState(location.state?.editMode || false);
  const [ formData, setFormData] = useState({});
  const [ graduationRequirements, setGraduationRequirements] = useState([]);
  const [ activeTab, setActiveTab] = useState("graduation-requirement");
  const [ loading, setLoading] = useState(true);
  const [ openDialog, setOpenDialog] = useState(false);
  const [ intakeFields, setIntakeFields] = useState(programmeIntakeFormFields);
  const [ academicSessions, setAcademicSessions] = useState([]);
  const [ programmes, setProgrammes] = useState([]);

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
        setOriginalFormData(data)
        setGraduationRequirements(data.graduation_requirements || []);
        console.log("first data: ", data)
      } catch (err) {
        console.error(err);
      }finally{
        setLoading(false);
      }
    };

    const fetchProgrammes = async () => {
      try {
        const res = await axiosClient.get(`/programmes`);
        setProgrammes(res.data);
        const programmeOptions = res.data.map(p => ({
          label: p.programme_name,
          value: p.programme_name
        }));

        setIntakeFields(prev =>
          prev.map(field =>
            field.key === "programme_name"
              ? { ...field, options: programmeOptions }
              : field
          )
        );
      } catch (err) {
        console.error(err);
      }
    };

    const fetchAcademicSessions = async () => {
      try {
        const res = await axiosClient.get(`/academic-sessions`);
        setAcademicSessions(res.data);

        const academicSessionOptions = res.data.map(academicSession => ({
          label: `${academicSession.year} ${academicSession.semester}`,
          value: academicSession._id
        }));

        setIntakeFields((prev) => (prev.map(field => {
          if(field.key === "academic_session_id"){
            return { ... field, options : academicSessionOptions };
          }
          return field
        }))) 
      } catch (err) {
        console.error(err);
      }
    }

    const run = async () => {
      try{
        if (!addProgrammeIntake) {
          await fetchProgrammeEnrollment();
        }else{
          setEditMode(true)
          setFormData({
            _id: "",
            programme_intake_code: "",
            programme_name: "",
            academic_session_id: "",
            academic_session: null,
            year: "",
            semester: "",
            department: "",
            faculty: "",
            min_semester: "",
            max_semester: "",
            number_of_students_enrolled: "0",
            number_of_students_graduated: "0",
            graduation_rate: "0",
            total_credit_hours: "",
            createdAt: "",
            updatedAt: "",
            programme_id: "",
            programme_code: "",
            graduation_requirements: [],
            programme_plan: []
          });

        }

        await fetchProgrammes();
        await fetchAcademicSessions();
      }catch(err){
        console.error(err);
      }finally{
        setLoading(false);
      }
    }

    run();

  }, [programme_intake_code]);

  useEffect(() => {
  if(editMode) {
    const { programme_name, year, semester } = formData;

    const programme = programmes.find(programme => programme.programme_name == formData.programme_name)
    setFormData(prev => ({ ...prev, department: programme?.department }));
    setFormData(prev => ({ ...prev, faculty: programme?.faculty }));


    if (programme_name && year && semester) {
      const code = generateProgrammeIntakeCode(programme, year, semester);
      setFormData(prev => ({ ...prev, programme_intake_code: code }));
    }
  }
}, [formData.programme_name, formData.year, formData.semester]);

  useEffect(() => {
  if(editMode) {
    const session = academicSessions.find(academicSession => academicSession._id == formData.academic_session_id);
    setFormData(prev => ({ ...prev, year: session?.year, semester: session?.semester, academic_session: session }));

  }

}, [formData.academic_session_id]);

  const handleBack = () => navigate("/admin/programme-intakes");

  const handleCancel = () => {
    if(!addProgrammeIntake){
      setFormData(originalFormData); // restore original data
      setGraduationRequirements(originalFormData.graduation_requirements || []);
      setEditMode(false);
    }else{
      navigate('/admin/programme-intakes')
    }
  }

  const handleEdit = () => setEditMode(true);

  const handleSave = async () => {
    try {
      if(!addProgrammeIntake){
        const res = await axiosClient.put(`/programme-intakes/${formData._id}`, formData);
        setEditMode(false);
        const data = {
          ...res.data,
          createdAt: formatDateToLocaleString(res.data.createdAt),
          updatedAt: formatDateToLocaleString(res.data.updatedAt),
        };
        console.log("data: ", data)
        setFormData(data)
        setOriginalFormData(data)
        setGraduationRequirements(data.graduation_requirements || []);
      }else{
        const res = await axiosClient.post(`/programme-intakes/${formData._id}`, formData);
        const programmeIntake = res.data
        setEditMode(false)
        navigate(`/admin/programme-intakes/${programmeIntake.programme_intake_code}`, { state : { programme_intake_code: programmeIntake.programme_intake_code  , editMode : false }})
      }

    } catch (err) {
      console.error("Error saving programme enrollment:", err);
    }
  };

  const handleDelete = () => {
    setOpenDialog(true);
  }

  const confirmDeleteProgrammeIntake = async () => {
    try {
        await axiosClient.delete(`/programme-intakes/${formData.programme_intake_code}`);
    } catch (error) {
        console.error("Error deleting course:", error);
    } finally {
        navigate("/admin/programme-intakes")
    }
  };

  const handleInputChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleGraduationRequirementsOnChange = (updatedRequirements) => {
    setFormData(prev => {
      const currentPlan = prev.programme_plan?.semester_plans || [];
      const updatedCodes = updatedRequirements.map(r => r.course_code);

      // CLEAN THE COURSE PLAN
      const cleanedSemesterPlans = currentPlan.map(sem => ({
        ...sem,
        courses: sem.courses
          ? sem.courses.filter(c => updatedCodes.includes(c.course_code))
          : []
      }));

      return {
        ...prev,
        graduation_requirements: updatedRequirements,
        programme_plan: {
          ...prev.programme_plan,
          semester_plans: cleanedSemesterPlans
        }
      };
    });

    // only update local state if you actually need it
    setGraduationRequirements(updatedRequirements);
  };


const handleProgrammePlanChange = (updatedSemesterPlans) => {
  const oriSemesterPlans = formData.programme_plan?.semester_plans || [];

  // Create a new programme plan with updated courses
  const updatedProgrammePlan = {
    ...formData.programme_plan,
    semester_plans: oriSemesterPlans.map((sem, idx) => ({
      ...sem,
      courses: updatedSemesterPlans.find((sem) => sem.semester === idx+1).courses
    }))
  };

  setFormData(prev => ({
    ...prev,
    programme_plan: updatedProgrammePlan
  }));
};


  const allowedKeys = intakeFields.map((f) => f.key);
  const entries = Object.entries(formData).filter(([key]) => allowedKeys.includes(key));
  const mid = Math.floor(entries.length / 2);
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
                    <>
                      <button
                        onClick={handleEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      {!addProgrammeIntake && (
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
                onConfirm={confirmDeleteProgrammeIntake}
                title="Delete Course"
                content={`Are you sure you want to delete programme intake  with code "${formData.programme_intake_code}"?`}
                confirmText="Delete"
                cancelText="Cancel"
              />

              {/* FORM CONTENT */}
              <div className="p-8 bg-white rounded-b-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Left Column */}
                  <div className="flex flex-col gap-6">
                    {leftEntries.map(([key, value]) => (
                      <FormField
                        key={key}
                        field={intakeFields.find((f) => f.key === key)}
                        value={value}
                        editMode={editMode}
                        onChange={handleInputChange(key)}
                        academicSessions={academicSessions}
                        onCreate={addProgrammeIntake}
                      />
                    ))}
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-6">
                    {rightEntries.map(([key, value]) => (
                      <FormField
                        key={key}
                        field={intakeFields.find((f) => f.key === key)}
                        value={value}
                        editMode={editMode}
                        onChange={handleInputChange(key)}
                        academicSessions={academicSessions}
                        onCreate={addProgrammeIntake}
                      />
                    ))}
                  </div>
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
                  <GraduationRequirement 
                    programmeEnrollment={formData} 
                    editMode={editMode} 
                    onChange={handleGraduationRequirementsOnChange}
                  />
                )}
                {activeTab === "course-plan" && (
                  <CoursePlan 
                    programmeEnrollment={formData} 
                    editMode={editMode} 
                    onChange={handleProgrammePlanChange}
                  />                
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

const FormField = ({ field, value, editMode, onChange, academicSessions, onCreate}) => {
  if (!field) return null;
  if( onCreate && field.autoCreation) return null;
  const { label, icon: Icon, type, multiline, options, placeholder } = field;

  let displayValue = value;
  if(field.key === "academic_session_id" ) {
    const session = academicSessions.find(session => session._id === value);
    displayValue = session ? `${session.year} - ${session.semester}` : "";
  }

  if (field.readonly) {
    return (
      <div className="flex items-start mb-3">
        {Icon && <div className="mr-3 mt-1 text-gray-400"><Icon size={18} /></div>}
        <div className="w-full">
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-sm font-semibold text-gray-900">{displayValue ?? "-"}</p>
        </div>
      </div>
    );
  }

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
          <p className="text-sm font-semibold text-gray-900 whitespace-pre-line">{displayValue ?? "-"}</p>
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
