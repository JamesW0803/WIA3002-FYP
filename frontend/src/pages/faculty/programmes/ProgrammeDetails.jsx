import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import GeneralCardHeader from "../../../components/Faculty/GeneralCardHeader";
import { programmeFormFields } from "../../../constants/programmeFormConfig";
import { Edit2, Save, X } from "lucide-react";

const ProgrammeDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const programme_code = location.state.programme_code;
  const [editMode, setEditMode] = useState(location.state?.editMode || false);
  const [formData, setFormData] = useState({});

  // Load programme details
  useEffect(() => {
    const fetchProgramme = async () => {
      try {
        const res = await axiosClient.get(`/programmes/${programme_code}`);
        setFormData(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProgramme();
  }, [programme_code]);

  // Handlers
  const handleBack = () => navigate("/admin/programmes");
  const handleCancel = () => setEditMode(false);
  const handleEdit = () => setEditMode(true);

  const handleSave = async () => {
    try {
      const res = await axiosClient.put(`/programmes/${formData.programme_code}`, formData);
      setFormData(res.data);
      setEditMode(false);
      console.log("Programme updated successfully");
    } catch (err) {
      console.error(err);
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

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
            <div>
              <h1 className="text-3xl font-bold">{formData.programme_name || "-"}</h1>
              <div className="text-sm bg-white/20 px-3 py-1 rounded-lg inline-block mt-2">
                {formData.programme_code || "-"}
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
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dynamic Field Component
const ProgrammeField = ({ icon: Icon, label, value, type, options, editMode, multiline, placeholder, onChange }) => {
  return (
    <div className="flex items-start gap-3">
      {Icon && <div className="mt-2 text-gray-400"><Icon size={18} /></div>}
      <div className="w-full">
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>

        {editMode ? (
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
          <p className="font-medium text-gray-900 whitespace-pre-line">{value || "-"}</p>
        )}
      </div>
    </div>
  );
};

export default ProgrammeDetails;
