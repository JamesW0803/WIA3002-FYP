import { useState, useEffect } from "react";
import Table from "../../../components/Table";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import ToolBar from "../../../components/ToolBar"
import Divider from '@mui/material/Divider';
import { useNavigate } from "react-router-dom";


const ManageCourses = () => {
    const navigate = useNavigate();

    const [courses, setCourses] = useState([]);
    const [items, setItems] = useState([]);
    const [clickableItems, setClickableItems] = useState(["course_code"])

    const header = ["Course Code", "Course Name", "Credit Hour", "Type", "Offered In", "Action"]
    const order = ["course_code", "course_name", "credit_hours", "type", "offered_semester"]
    
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await axiosClient.get("/courses");
                const courses = response.data;
                setCourses(courses);
            } catch (error) {
                console.error("Error fetching courses: ", error);
            }
        };
        fetchCourses();
    },[])


    /**
     * courses = [course1, course2, course3]
     * course = [[course_code, "dsa"], [course_code, "sadad"]]
    */
    useEffect(() => {
        const latestItem = courses.map((course) => {
            return  (
                Object.entries(course).map(([key, value]) => {
                    return {
                        key,
                        value,
                        type: clickableItems.includes(key) ? "clickable_text_display" : "text_display",
                        onClick : clickableItems.includes(key) ? () => handleCourseOnClick(course)  : null
                    }
                })
            )
        })
        setItems(latestItem);
    }, [courses])
    
    const handleCourseOnClick = (course) => {
        // navigate to course page
        navigate(`/admin/courses/${course.course_code}`, { state : { course }})
    }

    const handleButtonAddCourseOnClick = () => {
        navigate(`/admin/courses/add-course`, { state : { courses }})
    }

    return (
        <div className="coursesPage">
            <Title>Courses</Title>
            <Divider sx={{ marginX: 5 }} />
            <ToolBar
                button = {{
                    title : "Add Course",
                    onClick : handleButtonAddCourseOnClick
                }}
            />
            <Table
                header={header}
                items={items}
                order={order}
                // index={false}
            />
        </div> 
    )
}

export default ManageCourses;