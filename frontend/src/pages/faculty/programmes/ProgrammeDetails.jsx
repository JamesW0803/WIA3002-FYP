import { useLocation } from "react-router-dom";

const ProgrammeDetails = () => {
    const location = useLocation();
    const programme  = location.state.programme

    return (
        <div className="courseDetailsPage">
            <h1 className="text-2xl font-bold">Programmes | {programme.programme_code}</h1>

        </div> 
    )
}

export default ProgrammeDetails;