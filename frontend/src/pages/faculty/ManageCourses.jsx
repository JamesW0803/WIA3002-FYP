import { useState, useEffect } from "react";
import Table from "../../components/Table";
import axiosClient from "../../api/axiosClient";

const ManageCourses = () => {
    const [courses, setCourses] = useState([]);
    const header = ["Course Code", "Course Name", "Credit Hour", "Type", "Offered In", "Action"]
    const order = ["course_code", "course_name", "credit_hours", "type", "offered_semester"]

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await axiosClient.get("/courses");
                const courses = response.data;
                setCourses(courses);
            } catch (error) {
                console.error("Error fetching programmes: ", error);
            }
        };
        fetchCourses();
    },[])
    

    return (
        <div className="coursesPage">
            <h1 className="text-2xl font-bold">Courses</h1>
            <Table
                header={header}
                data={courses}
                order={order}
                // index={false}
            />
        </div> 



    )
}

export default ManageCourses;