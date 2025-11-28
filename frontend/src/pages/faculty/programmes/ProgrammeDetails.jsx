import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import GeneralCardHeader from "../../../components/Faculty/GeneralCardHeader";
import { programmeFormFields } from "../../../constants/programmeFormConfig";
import { Edit2, Save, X, Trash } from "lucide-react";
import FormDialog from "../../../components/dialog/FormDialog"
import Notification from "../../../components/Students/AcademicProfile/Notification";
import { useAcademicProfile } from "../../../hooks/useAcademicProfile";

const ProgrammeDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const programme_code = location.state?.programme_code;
  const addProgramme = location.state?.addProgramme || false;
  const [originalFormData, setOriginalFormData] = useState({})
  const [editMode, setEditMode] = useState(location.state?.editMode || false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const { 
        showNotification , 
        closeNotification,
        notification,
    } = useAcademicProfile()

  // Load programme details
  useEffect(() => {
    const fetchProgramme = async () => {
      try {
        const res = await axiosClient.get(`/programmes/${programme_code}`);
        setFormData(res.data);
        setOriginalFormData(res.data)
      } catch (err) {
        console.error(err);
      }
    };

    const run = async () => {
      try {
        if (!addProgramme) {
          await fetchProgramme();
        } else {
          // setEditMode(true);
          setFormData({
            programme_name : "",
            programme_code : "",
            description : "",
            faculty : "",
            department : ""
          })
        }

      } finally {
        setLoading(false);
      }
    }
    run();

  }, [programme_code]);

  // Handlers
  const handleBack = () => navigate("/admin/programmes");

  const handleCancel = () => {
    if(addProgramme){
      navigate("/admin/programmes")
    }
    setEditMode(false);
    setFormData(originalFormData)
  }

  const handleEdit = () => setEditMode(true);

  const handleSave = async () => {
    let branch = ""
    try {
      if(!addProgramme){
        branch = "update"
        const res = await axiosClient.put(`/programmes/${formData.programme_code}`, formData);
        setFormData(res.data);
        setOriginalFormData(res.data)
        showNotification("Programme is updated successfully" , "success")
        setEditMode(false)
      }else{
        branch = "oncreate"
        const res = await axiosClient.post(`/programmes`, formData);
        const savedCProgramme = res.data;
        showNotification("Programme is created successfully", "success")
        setEditMode(false)
        navigate(`/admin/programmes/${savedCProgramme.programme_code}`, { state : { programme_code : savedCProgramme.programme_code , editMode : false}})
      }
    } catch (err) {
      showNotification(`Error ${branch === "update" ? "updating" : "creating"} programme` , "error")
    }
  };

  const handleDelete = () => {
    setOpenDialog(true);
  }

  const confirmDeleteProgramme = async () => {
    try {
        await axiosClient.delete(`/programmes/${formData.programme_code}`);
        navigate("/admin/programmes", {
          state: {
            notificationMessage: "Programme is removed successfully",
            notificationType: "success"
          }
        });
    } catch (error) {
        showNotification("Error removing programme", "error")
        console.error("Error deleting programme:", error);
    }
  };

  const handleInputChange = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <GeneralCardHeader handleBack={handleBack} title="Back to Programmes" />

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {loading ? (
            <>
              <SkeletonHeader />

              <div className="p-8 space-y-12 bg-white">
                <SkeletonSection />
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                <div>
                  <h1 className="text-3xl font-bold">{formData.programme_name || "--Add New Programme--"}</h1>
                  <div className="text-sm bg-white/20 px-3 py-1 rounded-lg inline-block mt-2">
                    {formData.programme_code || "new_programme_code"}
                  </div>
                </div>

                <div className="flex gap-2 mt-4 md:mt-0">
                  {editMode || addProgramme ? (
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
                      {!addProgramme && (
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
                onConfirm={confirmDeleteProgramme}
                title="Delete Programme"
                content={`Are you sure you want to delete programme ${formData.programme_name} with code "${formData.programme_code}"?`}
                confirmText="Delete"
                cancelText="Cancel"
              />

              {/* Content */}
              <div className="p-8 space-y-12 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {programmeFormFields.map((field) => (
                    <ProgrammeField
                      key={field.key}
                      icon={field.icon}
                      label={field.label}
                      value={formData[field.key] ?? ""}
                      type={field.type}
                      options={field.options}
                      multiline={field.multiline}
                      placeholder={field.placeholder}
                      editMode={editMode}
                      onChange={handleInputChange(field.key)}
                      readonly={field.readonly ?? false}
                      addProgramme={addProgramme}
                    />
                  ))}
                </div>
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

// Dynamic Field Component
const ProgrammeField = ({ icon: Icon, label, value, type, options, editMode, multiline, placeholder, onChange , readonly=false, addProgramme}) => {
  if (readonly && editMode) {
    return (
      <div className="flex items-start mb-3">
        {Icon && <div className="mr-3 mt-1 text-gray-400"><Icon size={18} /></div>}
        <div className="w-full">
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-sm font-semibold text-gray-900">{value ?? "-"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {Icon && <div className="mt-2 text-gray-400"><Icon size={18} /></div>}
      <div className="w-full">
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>

        {editMode || addProgramme? (
          type === "select" ? (
            <select
              className="border border-gray-300 rounded-lg p-2 w-full text-sm"
              value={value}
              onChange={onChange}
            >
              <option value="">-- Select --</option>
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <textarea
              rows={multiline ? 3 : 1}
              className="border border-gray-300 rounded-lg p-2 w-full text-sm resize-none"
              value={value}
              placeholder={placeholder}
              onChange={onChange}
            />
          )
        ) : (
          <p className="font-semibold text-sm text-gray-900 whitespace-pre-line">{value || "-"}</p>
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
  <div className="flex items-start gap-3 animate-pulse">
    <div className="w-5 h-5 bg-gray-300 rounded mt-2"></div>
    <div className="w-full">
      <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
      <div className="h-8 w-full bg-gray-200 rounded"></div>
    </div>
  </div>
);

const SkeletonSection = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    <SkeletonField />
    <SkeletonField />
    <SkeletonField />
    <SkeletonField />
  </div>
);


export default ProgrammeDetails;
