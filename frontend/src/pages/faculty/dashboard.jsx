import axiosClient from "../../api/axiosClient"
import { useState, useEffect } from "react";
import Table from "../../components/table/Table";
import Title from "../../components/Title";
import ToolBar from "../../components/table/ToolBar"
import Divider from '@mui/material/Divider';
import { useNavigate } from "react-router-dom";
import StatusBadge from "../../components/Faculty/StatusBadge";
import { ALL_SHORT_FORMS } from "../../constants/shortForm";

const Dashboard = () => {
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [items, setItems] = useState([]);
    const [clickableItems, setClickableItems] = useState(["username", "matric_no"])
    const short_forms = ["programme_name"]

    // const [clickableItems, setClickableItems] = useState([""]) // just for bypass purpose for now
    

    const [searchKeywords, setSearchKeywords] = useState("");
    const [loading, setLoading] = useState(true);


    const header = ["Name", "Matric No", "Programme", "Intake Session" ,"Current Semester", "Expected Graduation", "Status"]
    const order = ["username", "matric_no", "programme_name", "intakeSession", "currentSemester", "expectedGraduation", "status"]
    
    useEffect(() => {
        const fetchStudents = async () =>{
            try {
                const response = await axiosClient.get("/students");
                const students = response.data;
                setStudents(students);
            }catch(error){
                console.error("Error fetching students.")
            }finally {
                setLoading(false);
            }
        }
        fetchStudents();
    }, [])

    useEffect(() => {
        const latestItem = students.map((student) => {
            return  (
                Object.entries(student).map(([key, value]) => {
                    if (key === "status") {
                        value = <StatusBadge status={value.status} />;
                    }
                    if(short_forms.includes(key)){
                        value = ALL_SHORT_FORMS[value] || value;
                    }
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

    const handleMessageOnClick = ( student_name ) => {
        // navigate to student details page
        const findConversation = async() => {
            const res = await axiosClient.post("/chat/conversations/create-or-get", {studentName : student_name});
            const conversation = res.data
            navigate(`/admin/helpdesk/`, { state : { conversationId: conversation._id }})
        }
        findConversation()
    }

    const StudentsActionBar = {
        viewButton : {
            onClick : handleStudentOnClick
        },
        messageButton : {
            onClick : handleMessageOnClick
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
                loading={loading}
                // index={false}
            />
        </div> 
    )
}

export default Dashboard;