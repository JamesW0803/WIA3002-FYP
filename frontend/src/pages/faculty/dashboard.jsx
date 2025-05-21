import axiosClient from "../../api/axiosClient"
import { useState, useEffect } from "react";
import Table from "../../components/Table";

const Dashboard = () => {
    const [students, setStudents] = useState([]);
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


    return (
        <div className="dashboard">
            <h1 className="text-2xl font-bold">Faculty Dashboard</h1>
            <Table
                header={header}
                data={students}
                order={order}
                // index={false}
            />
        </div> 
    )
}

export default Dashboard;