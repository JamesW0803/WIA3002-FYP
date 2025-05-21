import axiosClient from "../../api/axiosClient"
import { useState, useEffect } from "react";
import Table from "../../components/Table";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [items, setItems] = useState([]);
    const [clickableItems, setClickableItems] = useState(["username"])

    const header = ["Name", "Programme", "Current Semester", "Expected Graduation", "Progress", "Status"]
    const order = ["username", "programme", "currentSemester", "expectedGraduation", "progress", "status"]
    
    useEffect(() => {
        const fetchStudents = async () =>{
            try {
                const response = await axiosClient.get("/students");
                const students = response.data;
                setStudents(students);
                
            }catch(error){
                console.error("Error fetching students.")
            }
        }
        fetchStudents();
    }, [])

    useEffect(() => {
        const latestItem = students.map((student) => {
            return  (
                Object.entries(student).map(([key, value]) => {
                    return {
                        key,
                        value,
                        type: clickableItems.includes(key) ? "clickable_text_display" : "text_display",
                        onClick : clickableItems.includes(key) ? () => handleStudentOnClick(student)  : null
                    }
                })
            )
        })
        setItems(latestItem);
    }, [students])

    const handleStudentOnClick = (student) => {
        // navigate to student details page
        navigate(`/admin/home/${student.username}`, { state : { student }})
    }

    return (
        <div className="dashboard">
            <h1 className="text-2xl font-bold">Students' Progress</h1>
            <Table
                header={header}
                items={items}
                order={order}
                // index={false}
            />
        </div> 
    )
}

export default Dashboard;