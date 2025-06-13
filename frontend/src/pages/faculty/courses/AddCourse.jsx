import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import Divider from '@mui/material/Divider';
import TextInputField from "../../../components/form/TextInputField";
import SelectInputField from "../../../components/form/SelectInputField";
import ActionBar from "../../../components/form/ActionBar";
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
        { type : "text", key : "course_code" , label : "Course Code" },
        { type : "text", key : "course_name" , label : "Course Name" },
        { type : "text", key : "credit_hours" , label : "Credit Hours" },
        { type : "text", key : "description" , label : "Description" },
    ]
}

const classificationSession = {
    title : "Classification",
    fields : [
        {
            type : "select",
            label : "Faculty",
            key : "faculty",
            options : faculties.map((item) => ({label : item , value : item}))
        },
        {
            type : "select",
            label : "Department",
            key : "department",
            options : DEPARTMENTS.map((item) => ({label : item , value : item}))
        },
        {
            type : "select",
            label : "Type",
            key : "type",
            options : COURSE_TYPES.map((item) => ({label : READABLE_COURSE_TYPES[item], value : item}))
        },
        {
            type : "select",
            label : "Study Level",
            key : "study_level",
            options : studyLevels.map((item) => ({label : item , value : item}))
        },
        {
            type : "select",
            label : "Offered In",
            key : "offered_semester",
            options : semesters.map((item) => ({label : item , value : item}))
        }
    ]
}

const ConsolidatedForm = ({ courses , formData , setFormData}) => {
    const formSessions = [ basicInformationSession , classificationSession ]

    return (
        <div id="form-add-course" className="mt-10 flex flex-col mx-10">
            {formSessions.map((formSession) => {
                return (
                    <FormSession
                        title = {formSession.title}
                        fields = {formSession.fields}
                        formData = {formData}
                        setFormData = {setFormData}
                    />
                )
            })}
            <PrerequisitesFormSession 
                courses={courses} 
                formData = {formData}
                setFormData = {setFormData}
            />
        </div>
    )
}

const FormSession = ({ title , fields , formData , setFormData}) => {
    return (
        <div id={`form-session-${title}`} className="flex flex-col">
            <span className="font-semibold ml-16 my-4">{title}</span>
            {fields.map((field) => {
                if(field.type === "text") 
                    return <TextInputField 
                                label={field.label}
                                value={formData[field.key]}
                                onChange={ (e) => 
                                    setFormData({...formData, [field.key] : e.target.value})
                                }
                            />
                else if (field.type === "select")
                    return <SelectInputField 
                                label={field.label} 
                                options={field.options}
                                value={formData[field.key]}
                                onChange={(e) =>
                                    setFormData({ ...formData, [field.key]: e.target.value })
                                }
                            />
            })}
        </div>
    )
}

const PrerequisitesFormSession = ({ courses , formData , setFormData}) => {
    const [prerequisites, setPrerequisites] = useState([""])
    const courseOptions = courses.map((course) => ({
        label: `${course.course_code} ${course.course_name}`,
        value: course.course_code
    }));

    const handleAdd = () => {
        setFormData({
            ...formData,
            prerequisites: [...formData.prerequisites, ""]
        });   
    };


    const handleRemove = ( index ) => {
        const updated = formData.prerequisites.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            prerequisites: updated
        });
    };

    const handleChange = (index, value) => {
        const updated = [...formData.prerequisites];
        updated[index] = value;
        setFormData({
            ...formData,
            prerequisites: updated
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
                        onChange={ (e) => handleChange(index, e.target.value)}                    
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

const AddCourse = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const courses  = location.state.courses
    const [formData, setFormData] = useState({
        course_code : "",
        course_name : "",
        type : "",
        credit_hours : null,
        description : "",
        prerequisites : [],
        faculty : "",
        offered_semester : [],
        study_level : -1
    })

    const handleCancel = () => {
        navigate(`/admin/courses`)
    }

    const handleAdd = async() => {
        // Submit course form
        try {
            const response = await axiosClient.post("/courses", formData);
            const newAddedCourse = response.data
            console.log("Course is added successfully")
        } catch (error) {
            console.error("Error creating course: ", error);
        } finally {
            navigate(`/admin/courses`)

        }      
        // console.log("Form Data sent: ", formData)
    }
    
    const cancelButton = {
        title : "Cancel",
        onClick : handleCancel
    }

    const addButton = {
        title : "Add",
        onClick : handleAdd
    }

    return (
        <div className="page-add-course flex flex-col">
            <Title>Courses | New Course</Title>
            <Divider sx={{ marginX: 5 }} />
            <ConsolidatedForm 
                courses={courses} 
                formData = {formData}
                setFormData = {setFormData}
            />
            <ActionBar button1={cancelButton} button2={addButton}/>
        </div> 
    )
}

export default AddCourse;