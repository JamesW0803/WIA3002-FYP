import { useLocation } from "react-router-dom";

const StudentDetails = () => {
    const location = useLocation();
    const student  = location.state.student

    return (
        <div className="studentDetailsPage">
            <h1 className="text-2xl font-bold">Students' Progress | {student.username}</h1>

        </div> 



    )
}

export default StudentDetails;