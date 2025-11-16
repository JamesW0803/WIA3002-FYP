import { useLocation, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Outlet, Link } from 'react-router-dom';
import Title from "../../../components/Title";
import { useState , useEffect } from "react"
import axiosClient from "../../../api/axiosClient";
import ActionBar from "../../../components/form/ActionBar";
import TextInputField from "../../../components/form/TextInputField";
import SelectInputField from "../../../components/form/SelectInputField";
import { studentDetailFields } from "../../../constants/studentDetailsFormConfig"

const StudentDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { student_name } = useParams();
    const [editMode, setEditMode] = useState(location.state?.editMode || false);
    const [student, setStudent] = useState({})
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const fetchStudent = async() => {
            const response = await axiosClient.get(`/students/${student_name}`)
            const currentStudent = response.data

            setStudent(currentStudent)
            setFormData(currentStudent); // initial form data

        }
        fetchStudent()
    }, [student_name])

    const handleBack = () => {
        navigate(`/admin/student-progress`)
    }

    const backButton = {
        title : "Back",
        onClick : handleBack
    }

    // Handle input changes
    const handleInputChange = (key) => (event) => {
        setFormData((prevData) => ({
            ...prevData,
            [key]: event.target.value,
        }));
    };


    // Split form data into two columns
    const allowedKeys = studentDetailFields.map(field => field.key);

    const entries = Object.entries(formData).filter(
    ([key, _]) => allowedKeys.includes(key)
    );
    const mid = Math.ceil(entries.length / 2);
    const leftEntries = entries.slice(0, mid);
    const rightEntries = entries.slice(mid);

    return (
        <div className="flex flex-col w-full">
            <Title>Student's Progress | {student.username}</Title>
            <StudentDetailsDisplayTable 
                leftEntries={leftEntries} 
                rightEntries={rightEntries} 
                handleInputChange={handleInputChange} 
                editMode={editMode}
            />
            <NavTab/>
            <ChildrenContent academicProfile={student.academicProfile} programme_intake_id={student.programme_intake_id} student={student}/>   
            <ActionBar button1={backButton} button2={null}/>
        </div> 
    )
}

const NavTab = () => {
    const location = useLocation();
    const isActive = (path) => {
        return location.pathname.includes(path);
    };

    return (
        <div className="flex gap-4 mt-8 border-b border-gray-200 ml-10 w-[90%]">
            <Link 
                to="academic-profile"
                className={`pb-2 px-1 text-sm font-medium transition-colors duration-200 ${
                    isActive('academic-profile') 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                Academic Profile
            </Link>
            <Link 
                to="graduation-requirement"
                className={`pb-2 px-1 text-sm font-medium transition-colors duration-200 ${
                    isActive('graduation-requirement') 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                Graduation Requirement
            </Link>
            <Link 
                to="default-programme-plan"
                className={`pb-2 px-1 text-sm font-medium transition-colors duration-200 ${
                    isActive('default-programme-plan') 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                Default Programme Plan
            </Link>
            <Link 
                to="course-plan"
                className={`pb-2 px-1 text-sm font-medium transition-colors duration-200 ${
                    isActive('course-plan') 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                Course Plans
            </Link>
        </div>
    )
}

const ChildrenContent = ({ academicProfile , programme_intake_id , student }) => {
    return (
      <div className="p-4">
        <Outlet context={{ academicProfile , programme_intake_id , student }}/>
      </div>
    )
}

const StudentDetailsDisplayTable = ({ 
    leftEntries, 
    rightEntries, 
    handleInputChange, 
    editMode 
}) => {
    return (
        <div id="student-details-display-table" className="flex flex-row items-center justify-center w-[90%] ml-40">
            <StudentDetailsDisplayColumn  // Left Column
                entries={leftEntries} 
                handleInputChange={handleInputChange} 
                editMode={editMode} 
            />
            <StudentDetailsDisplayColumn // Right Column
                entries={rightEntries} 
                handleInputChange={handleInputChange} 
                editMode={editMode} 
            />
        </div>
    )
}

const StudentDetailsDisplayColumn = ({ entries, handleInputChange, editMode }) => {
    const location = useLocation();

    return (
        <div className="w-1/2">
            {entries.map(([key, value]) => {
                const field = studentDetailFields.find((field) => field.key === key)
                if(!field) return
                if(field.type === "text") 
                    return (
                    <div id={`form-field-${field.key}`} className="h-[50px]">
                        <TextInputField 
                                label={field.label}
                                value={value}
                                onChange={handleInputChange(key)}
                                editMode={editMode}
                                size={"small"}
                        />
                    </div>
                    )
                else if (field.type === "select")
                    return (
                        <div id={`form-field-${field.key}`} className="h-[50px]">
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

export default StudentDetails;