import { useLocation } from "react-router-dom";
import Title from "../../../components/Title";
import InfoTable from "../../../components/InfoTable";
import { courseTitleMapping } from "../../../constants/courseFieldTitles";
import { useState , useEffect } from "react"
import axiosClient from "../../../api/axiosClient";

const CourseDetails = () => {
    const location = useLocation();
    const course_code  = location.state.course_code
    const [course, setCourse] = useState({})
    const [courseKeyPairValue , setCourseKeyPairValue] = useState([])

    useEffect(() => {
        const fetchCourse = async() => {
            const response = await axiosClient.get(`/courses/${course_code}`)
            const currentCourse = response.data
            const updated = Object.entries(currentCourse).map(([key, value]) => {
                const readableKey = courseTitleMapping[key] || key;
                if(key === "prerequisites" && value.length > 0){
                    value = value[0]["course_code"]
                }
                return [readableKey, value];
            });
            setCourseKeyPairValue(updated)
            setCourse(currentCourse)
        }
        fetchCourse()
    }, [course_code])
    return (
        <div className="flex flex-col w-full">
            <Title>Courses | {course.course_code}</Title>
            <InfoTable  
                items={courseKeyPairValue}
            />
        </div> 
    )
}

export default CourseDetails;