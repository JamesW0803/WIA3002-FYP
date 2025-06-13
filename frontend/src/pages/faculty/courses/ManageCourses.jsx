import { useState, useEffect } from "react";
import Table from "../../../components/table/Table";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import ToolBar from "../../../components/table/ToolBar"
import Divider from '@mui/material/Divider';
import FormDialog from "../../../components/dialog/FormDialog"
import { useNavigate } from "react-router-dom";


const ManageCourses = () => {
    const navigate = useNavigate();

    const [courses, setCourses] = useState([]);
    const [items, setItems] = useState([]);
    const [clickableItems, setClickableItems] = useState(["course_code"])

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedCourseCodeToDelete, setSelectedCourseCodeToDelete] = useState(null);


    const header = ["Course Code", "Course Name", "Credit Hour", "Type", "Offered In"]
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
                        onClick : clickableItems.includes(key) ? () => handleCourseOnClick(course.course_code)  : null
                    }
                })
            )
        })
        setItems(latestItem);
    }, [courses])
    
    const handleCourseOnClick = (course_code) => {
        // navigate to course page
        navigate(`/admin/courses/${course_code}`, { state : { course_code }})
    }

    const handleButtonAddCourseOnClick = () => {
        navigate(`/admin/courses/add-course`, { state : { courses }})
    }

    const handleDeleteButtonOnClick = (course_code) => {
        console.log("course_code", course_code)
        setSelectedCourseCodeToDelete(course_code);
        setOpenDialog(true);
    }

    const confirmDeleteCourse = async () => {
        try {
            const response = await axiosClient.delete(`/courses/${selectedCourseCodeToDelete}`);
            setCourses(prev => prev.filter(course => course.course_code !== selectedCourseCodeToDelete));
        } catch (error) {
            console.error("Error deleting course:", error);
        } finally {
            setOpenDialog(false);
            setSelectedCourseCodeToDelete(null);
        }
    };

    const coursesActionBar = {
        viewButton : {
            onClick : handleCourseOnClick
        },
        // editButton : {

        // },
        deleteButton : {
            onClick : handleDeleteButtonOnClick
        }
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
                tableActionBarButton={coursesActionBar}
                identifier={"course_code"}
                // index={false}
            />
            <FormDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                onConfirm={confirmDeleteCourse}
                title="Delete Course"
                content={`Are you sure you want to delete course with code "${selectedCourseCodeToDelete}"?`}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div> 
    )
}

export default ManageCourses;