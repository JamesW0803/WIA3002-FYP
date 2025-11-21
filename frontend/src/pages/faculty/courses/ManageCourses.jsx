import { useState, useEffect } from "react";
import Table from "../../../components/table/Table";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import ToolBar from "../../../components/table/ToolBar"
import Divider from '@mui/material/Divider';
import FormDialog from "../../../components/dialog/FormDialog"
import { READABLE_COURSE_TYPES } from "../../../constants/courseType";
import { useNavigate } from "react-router-dom";

const ManageCourses = () => {
    const navigate = useNavigate();

    const [courses, setCourses] = useState([]);
    const [items, setItems] = useState([]);
    const [clickableItems, setClickableItems] = useState(["course_code", "course_name"])

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedCourseCodeToDelete, setSelectedCourseCodeToDelete] = useState(null);

    const [searchKeywords, setSearchKeywords] = useState("");
    const [loading, setLoading] = useState(true);


    const header = ["Course Code", "Course Name", "Credit Hour", "Type", "Offered In"]
    const order = ["course_code", "course_name", "credit_hours", "type", "offered_semester"]
    
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await axiosClient.get("/courses");
                const courses = response.data;
                setCourses(courses);
                console.log(courses);
            } catch (error) {
                console.error("Error fetching courses: ", error);
            }finally{
                setLoading(false);
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
                    if(key === "type"){
                        value = READABLE_COURSE_TYPES[value]
                    }
                    if(key === "offered_semester"){
                        value = "Semester " + value.map(sem => sem.replace("Semester ", "")).join(", ");
                    }
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

    useEffect( () => {
        if(searchKeywords === ""){
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
        }else{
            const fetchCourses = async () => {
                try {
                    const response = await axiosClient.get("/courses");
                    const courses = response.data;
                    const lowerSearch = searchKeywords.toLowerCase();
                    const filteredCourses = courses.filter( course => 
                        course.course_code.toLowerCase().includes(lowerSearch) ||
                        course.course_name.toLowerCase().includes(lowerSearch)
                    )
                    setCourses(filteredCourses);
                } catch (error) {
                    console.error("Error fetching courses: ", error);
                }
            };
            fetchCourses();
        }
    }, [searchKeywords])
    
    const handleCourseOnClick = (course_code) => {
        // navigate to course page
        navigate(`/admin/courses/${course_code}`, { state : { course_code , editMode : false , courses}})
    }

    const handleEditButtonOnClick = (course_code) => {
        // navigate to course page
        navigate(`/admin/courses/${course_code}`, { state : { course_code , editMode : true}})
    }

    const handleButtonAddCourseOnClick = () => {
        navigate(`/admin/courses/add-course`, { state : { courses }})
    }

    const handleDeleteButtonOnClick = (course_code) => {
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
        editButton : {
            onClick : handleEditButtonOnClick
        },
        deleteButton : {
            onClick : handleDeleteButtonOnClick
        }
    }

    const handleSearchKeywordsChange = (e) => {
        setSearchKeywords(e.target.value)
    }

    return (
        <div className="coursesPage min-h-screen flex flex-col">
            <Title>Courses</Title>
            <Divider sx={{ marginX: 5 }} />
            <ToolBar
                searchBar = {{
                    searchKeywords : searchKeywords,
                    onChange : handleSearchKeywordsChange
                }}

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
                loading={loading}
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