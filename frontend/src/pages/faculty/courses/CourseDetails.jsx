import { useLocation, useNavigate } from "react-router-dom";
import Title from "../../../components/Title";
import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import ActionBar from "../../../components/form/ActionBar";
import TextInputField from "../../../components/form/TextInputField";
import SelectInputField from "../../../components/form/SelectInputField";
import { allCourseFields } from "../../../constants/courseFormConfig";

const CourseDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const course_code = location.state.course_code;
    const [editMode, setEditMode] = useState(location.state?.editMode || false);
    const [course, setCourse] = useState({});
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const response = await axiosClient.get(`/courses/${course_code}`);
                const currentCourse = response.data;
                if (currentCourse.prerequisites?.length > 0) {
                    currentCourse.prerequisites = currentCourse.prerequisites[0].course_code;
                }
                setCourse(currentCourse);
                setFormData(currentCourse);
            } catch (error) {
                console.error("Error fetching course:", error);
            }
        };
        fetchCourse();
    }, [course_code]);

    const handleBack = () => navigate("/admin/courses");
    const handleCancel = () => setEditMode(false);
    const handleEdit = () => setEditMode(true);

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                prerequisites: formData.prerequisites ? formData.prerequisites : [],
            };
            await axiosClient.put(`/courses/${formData.course_code}`, payload);
            setEditMode(false);
            console.log("Course updated successfully");
        } catch (error) {
            console.error("Error updating course:", error);
        }
    };

    const actionButtons = editMode
        ? { button1: { title: "Cancel", onClick: handleCancel }, button2: { title: "Save", onClick: handleSave } }
        : { button1: { title: "Back", onClick: handleBack }, button2: { title: "Edit", onClick: handleEdit } };

    const handleInputChange = (key) => (event) => {
        setFormData((prev) => ({ ...prev, [key]: event.target.value }));
    };

    return (
        <div className="flex flex-col items-center min-h-screen w-full bg-gray-50 p-6 space-y-6">
            <Title>Courses | {course.course_code}</Title>

            <div className="w-full max-w-5xl bg-white shadow-md rounded-xl p-6 flex flex-col md:flex-row gap-6">
                <CourseColumn entries={formData} handleInputChange={handleInputChange} editMode={editMode} courses={location.state?.courses || []} />
            </div>

            <ActionBar button1={actionButtons.button1} button2={actionButtons.button2} />
        </div>
    );
};

const CourseColumn = ({ entries, handleInputChange, editMode, courses }) => {
    const leftFields = allCourseFields.filter((f, idx) => idx % 2 === 0);
    const rightFields = allCourseFields.filter((f, idx) => idx % 2 !== 0);

    return (
        <div className="flex flex-col md:flex-row w-full gap-6">
            <FormColumn fields={leftFields} formData={entries} handleInputChange={handleInputChange} editMode={editMode} courses={courses} />
            <FormColumn fields={rightFields} formData={entries} handleInputChange={handleInputChange} editMode={editMode} courses={courses} />
        </div>
    );
};

const FormColumn = ({ fields, formData, handleInputChange, editMode, courses }) => (
    <div className="flex-1 flex flex-col gap-4">
        {fields.map((field) => {
            if (!field) return null;
            const value = formData[field.key] ?? "";

            if (field.key === "prerequisites") {
                const options = courses.map((c) => ({ label: `${c.course_code} - ${c.course_name}`, value: c.course_code }));
                return (
                    <SelectInputField
                        key={field.key}
                        label={field.label || "Prerequisite"}
                        options={options}
                        value={value}
                        onChange={handleInputChange(field.key)}
                        editMode={editMode}
                    />
                );
            }

            if (field.type === "text") {
                return (
                    <TextInputField
                        key={field.key}
                        label={field.label}
                        value={value}
                        onChange={handleInputChange(field.key)}
                        editMode={editMode}
                    />
                );
            }

            if (field.type === "select") {
                return (
                    <SelectInputField
                        key={field.key}
                        label={field.label}
                        options={field.options}
                        value={value}
                        onChange={handleInputChange(field.key)}
                        editMode={editMode}
                    />
                );
            }

            return null;
        })}
    </div>
);

export default CourseDetails;
