import axiosClient from "../../api/axiosClient"
import { useState, useEffect } from "react";
import Table from "../../components/table/Table";
import Title from "../../components/Title";
import ToolBar from "../../components/table/ToolBar"
import Divider from '@mui/material/Divider';
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [items, setItems] = useState([]);
    // const [clickableItems, setClickableItems] = useState(["username"])
    const [clickableItems, setClickableItems] = useState([""]) // just for bypass purpose for now
    

    const [searchKeywords, setSearchKeywords] = useState("");

    const header = ["Name", "Programme", "Current Semester", "Expected Graduation", "Progress", "Status"]
    const order = ["username", "programme_name", "currentSemester", "expectedGraduation", "progress", "status"]
    
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
                        onClick : clickableItems.includes(key) ? () => handleStudentOnClick(student.username)  : null
                    }
                })
            )
        })
        setItems(latestItem);
    }, [students])

    useEffect( () => {
        if(searchKeywords === ""){
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
        }else{
            const fetchStudents = async () =>{
                try {
                    const response = await axiosClient.get("/students");
                    const students = response.data;
                    const lowerSearch = searchKeywords.toLowerCase();
                    const filteredStudents = students.filter( student => 
                        student.username.toLowerCase().includes(lowerSearch) 
                        // || student.course_name.toLowerCase().includes(lowerSearch)
                    )
                    setStudents(filteredStudents);
                }catch(error){
                    console.error("Error fetching students.")
                }
            }
            fetchStudents();
        }
    }, [searchKeywords])

    const handleStudentOnClick = ( student_name ) => {
        // navigate to student details page
        navigate(`/admin/student-progress/${student_name}`, { state : { student_name }})
    }

    const StudentsActionBar = {
        viewButton : {
            onClick : handleStudentOnClick
        },
        editButton : null,
        deleteButton : null
    }

    const handleSearchKeywordsChange = (e) => {
        setSearchKeywords(e.target.value)
    }
    
    return (
        <div className="dashboard">
            <Title>Students' Progress</Title>
            <Divider sx={{ marginX: 5 }} />
            <ToolBar 
                searchBar = {{
                    searchKeywords : searchKeywords,
                    onChange : handleSearchKeywordsChange
                }}
            
                addButton={false}/>
            <Table
                header={header}
                items={items}
                order={order}
                tableActionBarButton={StudentsActionBar}
                identifier={"username"}
                // index={false}
            />
        </div> 
    )
}

export default Dashboard;