import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import Divider from '@mui/material/Divider';
import TextInputField from "../../../components/form/TextInputField";
import SelectInputField from "../../../components/form/SelectInputField";
import { DEPARTMENTS } from "../../../constants/department";
import { COURSE_TYPES } from "../../../constants/courseType";
import { READABLE_COURSE_TYPES } from "../../../constants/courseType";
import { useLocation , useNavigate } from "react-router-dom";

const faculties = ["Faculty of Computer Science and Information Technology"]
const studyLevels = [0 , 1, 2, 3]
const semesters = ["Semester 1", "Semester 2", "Semester 1 & 2", "Special Semester", "ALL"]

const basicInformationSession = {
    title : "Basic Information",
    fields : [
        { type : "text", label : "Course Code" },
        { type : "text", label : "Course Name" },
        { type : "text", label : "Credit Hours" },
        { type : "text", label : "Description" },
    ]
}

const classificationSession = {
    title : "Classification",
    fields : [
        {
            type : "select",
            label : "Faculty",
            options : faculties.map((item) => ({label : item , value : item}))
        },
        {
            type : "select",
            label : "Department",
            options : DEPARTMENTS.map((item) => ({label : item , value : item}))
        },
        {
            type : "select",
            label : "Type",
            options : COURSE_TYPES.map((item) => ({label : READABLE_COURSE_TYPES[item], value : item}))
        },
        {
            type : "select",
            label : "Study Level",
            options : studyLevels.map((item) => ({label : item , value : item}))
        },
        {
            type : "select",
            label : "Offered In",
            options : semesters.map((item) => ({label : item , value : item}))
        }
    ]
}

const AddCourse = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const courses  = location.state.courses

    return (
        <div className="page-add-course">
            <Title>Courses | New Course</Title>
            <Divider sx={{ marginX: 5 }} />
            <ConsolidatedForm courses={courses} />
        </div> 
    )
}

const ConsolidatedForm = ( {courses} ) => {
    const formSessions = [ basicInformationSession , classificationSession ]

    return (
        <div id="form-add-course" className="mt-10 flex flex-col mx-10">
            {formSessions.map((formSession) => {
                return (
                    <FormSession
                        title = {formSession.title}
                        fields = {formSession.fields}
                    />
                )
            })}
            <PrerequisitesFormSession courses={courses} />
        </div>
    )
}

const FormSession = ({ title , fields}) => {
    return (
        <div id={`form-session-${title}`} className="flex flex-col">
            <span className="font-semibold ml-16 my-4">{title}</span>
            {fields.map((field) => {
                if(field.type === "text") 
                    return <TextInputField label={field.label}/>
                else if (field.type === "select")
                    return <SelectInputField label={field.label} options={field.options}/>
            })}
        </div>
    )
}

const PrerequisitesFormSession = ({courses}) => {
    const [prerequisites, setPrerequisites] = useState([""])
    const courseOptions = courses.map((course) => ({
        label: `${course.course_code} ${course.course_name}`,
        value: course.course_code
    }));

    const handleAdd = () => {
        setPrerequisites([...prerequisites, ""]);
    };


    const handleRemove = (index) => {
        const updated = prerequisites.filter((_, i) => i !== index);
        setPrerequisites(updated);
    };

    return (
        <div id={`form-session-prerequisites`} className="flex flex-col">
            <span className="font-semibold ml-16">Prerequisites</span>
            <span className="font-extralight ml-16 mb-4">
                Select any prerequisite course if applicable
            </span>

            {prerequisites.map((value, index) => (
                <div key={index} className="flex flex-row items-center">
                    <SelectInputField
                        label={`Prerequisite ${index + 1}`}
                        options={courseOptions}
                        // value={value}
                        // onChange={(e) => handleChange(index, e.target.value)}
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
    )
}

export default AddCourse;