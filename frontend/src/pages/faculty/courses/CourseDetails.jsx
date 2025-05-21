import { useLocation } from "react-router-dom";

const CourseDetails = () => {
    const location = useLocation();
    const course  = location.state.course

    return (
        <div className="courseDetailsPage">
            <h1 className="text-2xl font-bold">Courses | {course.course_code}</h1>

        </div> 
    )
}

export default CourseDetails;