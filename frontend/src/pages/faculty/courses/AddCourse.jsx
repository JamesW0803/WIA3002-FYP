import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import Divider from "@mui/material/Divider";
import TextInputField from "../../../components/form/TextInputField";
import SelectInputField from "../../../components/form/SelectInputField";
import ActionBar from "../../../components/form/ActionBar";
import { useLocation, useNavigate } from "react-router-dom";
import { formSessions } from "../../../constants/courseFormConfig";
import ProgrammeTypesSession from "../../../components/Faculty/Courses/ProgrammeTypesSession";

const basicInformationSession = formSessions.find(
  (session) => session["title"] === "Basic Information"
);

const classificationSession = formSessions.find(
  (session) => session["title"] === "Classification"
);

const ConsolidatedForm = ({ courses, programmes, formData, setFormData }) => {
  const formSessions = [basicInformationSession, classificationSession];

  return (
    <div id="form-add-course" className="mt-10 flex flex-col mx-10">
      {formSessions.map((formSession) => {
        return (
          <FormSession
            key={formSession.title}
            title={formSession.title}
            fields={formSession.fields}
            formData={formData}
            setFormData={setFormData}
          />
        );
      })}

      <PrerequisitesFormSession
        courses={courses}
        formData={formData}
        setFormData={setFormData}
      />

      <ProgrammePrerequisitesFormSession
        programmes={programmes}
        courses={courses}
        formData={formData}
        setFormData={setFormData}
      />

      <ProgrammeTypesSession
        programmes={programmes}
        formData={formData}
        setFormData={setFormData}
        editMode={true}
        addCourse={true}
      />
    </div>
  );
};

const FormSession = ({ title, fields, formData, setFormData }) => {
  return (
    <div id={`form-session-${title}`} className="flex flex-col">
      <span className="font-semibold ml-16 my-4">{title}</span>
      {fields.map((field) => {
        if (field.type === "text")
          return (
            <div id={`form-field-${field.key}`} className="w-1/2">
              <TextInputField
                label={field.label}
                value={formData[field.key]}
                onChange={(e) =>
                  setFormData({ ...formData, [field.key]: e.target.value })
                }
              />
            </div>
          );
        else if (field.type === "select")
          return (
            <div id={`form-field-${field.key}`} className="w-1/2">
              <SelectInputField
                label={field.label}
                options={field.options}
                value={formData[field.key]}
                onChange={(e) =>
                  setFormData({ ...formData, [field.key]: e.target.value })
                }
              />
            </div>
          );
      })}
    </div>
  );
};

const PrerequisitesFormSession = ({ courses, formData, setFormData }) => {
  //   const [prerequisites, setPrerequisites] = useState([""]);
  const courseOptions = courses.map((course) => ({
    label: `${course.course_code} ${course.course_name}`,
    value: course.course_code,
  }));

  const handleAdd = () => {
    setFormData({
      ...formData,
      prerequisites: [...formData.prerequisites, ""],
    });
  };

  const handleRemove = (index) => {
    const updated = formData.prerequisites.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      prerequisites: updated,
    });
  };

  const handleChange = (index, value) => {
    const updated = [...formData.prerequisites];
    updated[index] = value;
    setFormData({
      ...formData,
      prerequisites: updated,
    });
  };

  return (
    <div id={`form-session-prerequisites`} className="flex flex-col">
      <span className="font-semibold ml-16">Prerequisites</span>
      <span className="font-extralight ml-16 mb-4">
        Select any prerequisite course if applicable
      </span>

      {formData.prerequisites.map((value, index) => (
        <div key={index} className="flex flex-row items-center">
          <SelectInputField
            label={`Prerequisite ${index + 1}`}
            options={courseOptions}
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
          />
          {index >= 0 && (
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="text-red-500 text-sm ml-10"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center ml-10 mb-2 gap-2">
        <button
          type="button"
          onClick={handleAdd}
          className="ml-16 text-blue-600 text-sm hover:underline"
        >
          + Add another prerequisite
        </button>
      </div>
    </div>
  );
};

const ProgrammePrerequisitesFormSession = ({
  programmes,
  courses,
  formData,
  setFormData,
}) => {
  // Dropdown options
  const programmeOptions = (programmes || []).map((p) => ({
    label: `${p.programme_code} - ${p.programme_name}`,
    value: p.programme_code,
  }));

  const courseOptions = (courses || []).map((course) => ({
    label: `${course.course_code} ${course.course_name}`,
    value: course.course_code,
  }));

  const addProgrammeConfig = () => {
    const current = formData.prerequisitesByProgramme || [];
    setFormData({
      ...formData,
      prerequisitesByProgramme: [
        ...current,
        { programme_code: "", prerequisite_codes: [""] }, // start with one empty prereq
      ],
    });
  };

  const removeProgrammeConfig = (index) => {
    const current = formData.prerequisitesByProgramme || [];
    const updated = current.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      prerequisitesByProgramme: updated,
    });
  };

  const updateProgrammeCode = (index, programme_code) => {
    const current = formData.prerequisitesByProgramme || [];
    const updated = [...current];
    updated[index] = {
      ...updated[index],
      programme_code,
    };
    setFormData({
      ...formData,
      prerequisitesByProgramme: updated,
    });
  };

  const addProgrammePrereq = (index) => {
    const current = formData.prerequisitesByProgramme || [];
    const updated = [...current];
    const cfg = updated[index] || {
      programme_code: "",
      prerequisite_codes: [],
    };
    updated[index] = {
      ...cfg,
      prerequisite_codes: [...(cfg.prerequisite_codes || []), ""],
    };
    setFormData({
      ...formData,
      prerequisitesByProgramme: updated,
    });
  };

  const updateProgrammePrereq = (index, prereqIndex, value) => {
    const current = formData.prerequisitesByProgramme || [];
    const updated = [...current];
    const cfg = updated[index];
    const prereqs = [...(cfg.prerequisite_codes || [])];
    prereqs[prereqIndex] = value;
    updated[index] = {
      ...cfg,
      prerequisite_codes: prereqs,
    };
    setFormData({
      ...formData,
      prerequisitesByProgramme: updated,
    });
  };

  const removeProgrammePrereq = (index, prereqIndex) => {
    const current = formData.prerequisitesByProgramme || [];
    const updated = [...current];
    const cfg = updated[index];
    const prereqs = (cfg.prerequisite_codes || []).filter(
      (_, i) => i !== prereqIndex
    );
    updated[index] = {
      ...cfg,
      prerequisite_codes: prereqs,
    };
    setFormData({
      ...formData,
      prerequisitesByProgramme: updated,
    });
  };

  return (
    <div
      id="form-session-programme-prerequisites"
      className="flex flex-col mt-8"
    >
      <span className="font-semibold ml-16">
        Programme-specific prerequisites
      </span>
      <span className="font-extralight ml-16 mb-4 text-sm">
        These override the global prerequisites for the selected programme.
      </span>

      {(formData.prerequisitesByProgramme || []).map((cfg, index) => (
        <div
          key={index}
          className="ml-16 mb-4 border rounded-xl p-4 flex flex-col gap-3"
        >
          {/* Programme selector + remove button */}
          <div className="flex items-center gap-4">
            <div className="w-1/2">
              <SelectInputField
                label="Programme"
                options={programmeOptions}
                value={cfg.programme_code || ""}
                onChange={(e) => updateProgrammeCode(index, e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => removeProgrammeConfig(index)}
              className="text-red-500 text-xs hover:underline"
            >
              Remove programme config
            </button>
          </div>

          {/* Prereqs for this programme */}
          <div className="flex flex-col gap-2">
            {(cfg.prerequisite_codes || []).map((value, pIndex) => (
              <div key={pIndex} className="flex flex-row items-center gap-3">
                <div className="w-1/2">
                  <SelectInputField
                    label={`Prerequisite ${pIndex + 1}`}
                    options={courseOptions}
                    value={value}
                    onChange={(e) =>
                      updateProgrammePrereq(index, pIndex, e.target.value)
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeProgrammePrereq(index, pIndex)}
                  className="text-red-500 text-xs hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addProgrammePrereq(index)}
              className="text-blue-600 text-xs hover:underline mt-1"
            >
              + Add another prerequisite for this programme
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addProgrammeConfig}
        className="ml-16 text-blue-600 text-sm hover:underline"
      >
        + Add programme-specific prerequisites
      </button>
    </div>
  );
};

const AddCourse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const courses = location.state.courses;
  const [programmes, setProgrammes] = useState([]);
  const [formData, setFormData] = useState({
    course_code: "",
    course_name: "",
    type: "",
    credit_hours: null,
    description: "",
    prerequisites: [],
    prerequisitesByProgramme: [],
    typesByProgramme: [],
    faculty: "",
    offered_semester: [],
    study_level: null,
  });

  useEffect(() => {
    const fetchProgrammes = async () => {
      try {
        const res = await axiosClient.get("/programmes");
        setProgrammes(res.data);
      } catch (err) {
        console.error("Error fetching programmes: ", err);
      }
    };

    fetchProgrammes();
  }, []);

  const handleCancel = () => {
    navigate(`/admin/courses`);
  };

  const handleAdd = async () => {
    console.log("formData: ", formData);

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
      typesByProgramme: (formData.typesByProgramme || [])
        .filter((cfg) => cfg.programme_code && cfg.type)
        .map((cfg) => ({
          programme_code: cfg.programme_code,
          type: cfg.type,
        })),
    };

    try {
      const response = await axiosClient.post("/courses", payload);
      const newAddedCourse = response.data;
      console.log("Course is added successfully");
    } catch (error) {
      console.error("Error creating course: ", error);
      console.error(
        "Server response:",
        error.response?.data?.error || error.response?.data
      );
    } finally {
      navigate(`/admin/courses`);
    }
  };

  const cancelButton = {
    title: "Cancel",
    onClick: handleCancel,
  };

  const addButton = {
    title: "Add",
    onClick: handleAdd,
  };

  return (
    <div className="page-add-course flex flex-col">
      <Title>Courses | New Course</Title>
      <Divider sx={{ marginX: 5 }} />
      <ConsolidatedForm
        courses={courses}
        programmes={programmes}
        formData={formData}
        setFormData={setFormData}
      />
      <ActionBar button1={cancelButton} button2={addButton} />
    </div>
  );
};

export default AddCourse;
