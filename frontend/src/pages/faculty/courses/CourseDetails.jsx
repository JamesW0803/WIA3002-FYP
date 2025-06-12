import { useLocation } from "react-router-dom";
import Title from "../../../components/Title";
import InfoTable from "../../../components/InfoTable";
import { courseTitleMapping } from "../../../constants/courseFieldTitles";

const CourseDetails = () => {
    const location = useLocation();
    const course  = location.state.course

    const courseKeyPairValue = Object.entries(course).map(([key, value]) => {
        const readableKey = courseTitleMapping[key] || key;
        if(key === "prerequisites" && value.length > 0){
            value = value[0]["course_code"]
        }
        return [readableKey, value];
    });
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