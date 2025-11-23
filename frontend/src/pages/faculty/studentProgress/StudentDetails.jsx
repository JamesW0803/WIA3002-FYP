import { useLocation, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useState , useEffect } from "react"
import axiosClient from "../../../api/axiosClient";
import { studentDetailFields } from "../../../constants/studentDetailsFormConfig"
import StudentProfileHeader from "../../../components/Faculty/StudentProfileHeader";
import StudentDetailsDisplayTable from "../../../components/Faculty/StudentProfileDetails";
import StudentNavTabs from "../../../components/Faculty/StudentNavTabs";
import StudentAcademicProfile from "../../../components/Faculty/StudentAcademicProfile";
import StudentGraduationRequirement from "../../../components/Faculty/StudentGraduationRequirement";
import DefaultProgrammePlan from "../../../components/Faculty/DefaultProgrammePlan";

const StudentDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { student_name } = useParams();
    const [editMode, setEditMode] = useState(location.state?.editMode || false);
    const [student, setStudent] = useState({})
    const [formData, setFormData] = useState({});
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("academic-profile");

    const tabs = [
        { id: "academic-profile", label: "Academic Profile" },
        { id: "graduation-requirement", label: "Graduation Requirement" },
        { id: "default-programme-plan", label: "Default Programme Plan" },
    ];

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
        <div className="flex flex-col h-screen w-full">
            <StudentProfileHeader student={student} messageModalOpen={messageModalOpen} setMessageModalOpen={setMessageModalOpen} handleBack={backButton.onClick}/>
            <StudentDetailsDisplayTable 
                leftEntries={leftEntries} 
                rightEntries={rightEntries} 
                handleInputChange={handleInputChange} 
                editMode={editMode}
            />
            <StudentNavTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

            {/*Tabs*/}
            {activeTab === "academic-profile" && (
            <StudentAcademicProfile
                academicProfile={student.academicProfile}
                student={student}
            />
            )}

            {activeTab === "graduation-requirement" && (
            <StudentGraduationRequirement
                academicProfile={student.academicProfile}
                programme_intake_id={student.programme_intake_id}
            />
            )}

            {activeTab === "default-programme-plan" && (
            <DefaultProgrammePlan
                academicProfile={student.academicProfile}
                programme_intake_id={student.programme_intake_id}
            />
            )}
        </div> 
    )
}

export default StudentDetails;