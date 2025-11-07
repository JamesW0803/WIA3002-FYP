import { useLocation, useNavigate } from "react-router-dom";
import Title from "../../../components/Title";
import { useState , useEffect } from "react"
import axiosClient from "../../../api/axiosClient";
import ActionBar from "../../../components/form/ActionBar";
import TextInputField from "../../../components/form/TextInputField";
import SelectInputField from "../../../components/form/SelectInputField";
import { allCourseFields } from "../../../constants/courseFormConfig"

const CourseDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const course_code  = location.state.course_code
    const [editMode, setEditMode] = useState(location.state?.editMode || false);
    const [course, setCourse] = useState({})
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const fetchCourse = async() => {
            const response = await axiosClient.get(`/courses/${course_code}`)
            const currentCourse = response.data

            // Flatten prerequisites if necessary
            if (currentCourse.prerequisites && currentCourse.prerequisites.length > 0) {
                currentCourse.prerequisites = currentCourse.prerequisites[0].course_code;
            }
            setCourse(currentCourse)
            setFormData(currentCourse); // initial form data

        }
        fetchCourse()
    }, [course_code])

    const handleBack = () => {
        navigate(`/admin/courses`)
    }

    const handleCancel = () => {
        setEditMode(false)
    }

    const handleEdit = () => {
        setEditMode(true)
    }

    const handleSave = async() => {
        // Submit edit course form
        try {
            const payload = {
                ...formData,
                prerequisites: formData.prerequisites
                    ? formData.prerequisites  // wrap it in an array
                    : [],                       // fallback to empty array
            };

            const response = await axiosClient.put(`/courses/${formData.course_code}`, payload);
            const updatedCourse = response.data
            setEditMode(false)
            console.log("Course is updated successfully")
        } catch (error) {
            console.error("Error updating course: ", error);
        } finally {
            
        }      
    }

    const cancelButton = {
        title : "Cancel",
        onClick : handleCancel
    }

    const saveButton = {
        title : "Save",
        onClick : handleSave
    }

    const backButton = {
        title : "Back",
        onClick : handleBack
    }

    const editButton = {
        title : "Edit",
        onClick : handleEdit
    }


    // Handle input changes
    const handleInputChange = (key) => (event) => {
        setFormData((prevData) => ({
            ...prevData,
            [key]: event.target.value,
        }));
    };

    // Split form data into two columns
    const entries = Object.entries(formData);
    const mid = Math.ceil(entries.length / 2);
    const leftEntries = entries.slice(0, mid);
    const rightEntries = entries.slice(mid);

    return (
        <div className="flex flex-col w-full">
            <Title>Courses | {course.course_code}</Title>
            <CourseDisplayTable 
                leftEntries={leftEntries} 
                rightEntries={rightEntries} 
                handleInputChange={handleInputChange} 
                editMode={editMode}
            />
            {editMode ?
                <ActionBar button1={cancelButton} button2={saveButton}/>
            :   
                <ActionBar button1={backButton} button2={editButton}/>
            }
        </div> 
    )
}

const CourseDisplayTable = ({ 
    leftEntries, 
    rightEntries, 
    handleInputChange, 
    editMode 
}) => {
    return (
        <div id="course-display-table" className="flex flex-row items-center justify-center w-[90%] ml-40">
            <CourseDisplayColumn  // Left Column
                entries={leftEntries} 
                handleInputChange={handleInputChange} 
                editMode={editMode} 
            />
            <CourseDisplayColumn // Right Column
                entries={rightEntries} 
                handleInputChange={handleInputChange} 
                editMode={editMode} 
            />
        </div>
    )
}

const CourseDisplayColumn = ({ entries, handleInputChange, editMode }) => {
    console.log("entries: ", entries)
    const location = useLocation();
    const [courses, setCourses] = useState(location.state?.courses || [])

    return (
        <div className="w-1/2">
            {entries.map(([key, value]) => {
                const field = allCourseFields.find((field) => field.key === key)
                if(field == null) return
                if (key === "prerequisites") {
                    const options = courses.map((course) => ({
                        label: course.course_code + " - " + course.course_name,
                        value: course.course_code
                    }));

                    return (
                        <div key={key} id={`form-field-${key}`}>
                            <SelectInputField 
                                label={field.label || "Prerequisite"} 
                                options={options}
                                value={value}
                                onChange={handleInputChange(key)}
                                editMode={editMode}
                            />
                        </div>
                    )
                }
                if(field.type === "text") 
                    return (
                    <div id={`form-field-${field.key}`}>
                        <TextInputField 
                                label={field.label}
                                value={value}
                                onChange={handleInputChange(key)}
                                editMode={editMode}
                        />
                    </div>
                    )
                else if (field.type === "select")
                    return (
                        <div id={`form-field-${field.key}`}>
                            <SelectInputField 
                                label={field.label} 
                                options={field.options}
                                value={value}
                                onChange={handleInputChange(key)}
                                editMode={editMode}

                            />
                        </div>
                    )
            })}
        </div>
    );
};

export default CourseDetails;