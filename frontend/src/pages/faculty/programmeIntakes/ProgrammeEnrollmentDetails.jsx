import { useLocation, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Outlet, Link } from 'react-router-dom';
import Title from "../../../components/Title";
import { useState , useEffect } from "react"
import axiosClient from "../../../api/axiosClient";
import ActionBar from "../../../components/form/ActionBar";
import TextInputField from "../../../components/form/TextInputField";
import SelectInputField from "../../../components/form/SelectInputField";
import { programmeIntakeFormFields } from "../../../constants/programmeIntakeFormConfig"

const ProgrammeEnrollmentDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // const programme_intake_code  = location.state.programme_intake_code

    const { programme_intake_code } = useParams();
    const [editMode, setEditMode] = useState(location.state?.editMode || false);
    const [programmeEnrollment, setProgrammeEnrollment] = useState({})
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const fetchProgrammeEnrollment = async() => {
            const response = await axiosClient.get(`/programme-intakes/${programme_intake_code}`)
            const currentProgrammeEnrollment = response.data

            setProgrammeEnrollment(currentProgrammeEnrollment)
            setFormData(currentProgrammeEnrollment); // initial form data

        }
        fetchProgrammeEnrollment()
    }, [programme_intake_code])

    const handleBack = () => {
        navigate(`/admin/programme-intakes`)
    }

    const handleCancel = () => {
        setEditMode(false)
    }

    const handleEdit = () => {
        setEditMode(true)
    }

    const handleSave = async() => {
        // Submit edit course form
        try {
            const payload = {
                ...formData
            };

            const response = await axiosClient.put(`/programme-intakes/${formData.programme_intake_code}`, payload);
            const updatedProgrammeEnrollment = response.data
            setEditMode(false)
            console.log("Programme Enrollment is updated successfully")
        } catch (error) {
            console.error("Error updating programme enrollment: ", error);
        } finally {
            
        }      
    }

    const cancelButton = {
        title : "Cancel",
        onClick : handleCancel
    }

    const saveButton = {
        title : "Save",
        onClick : handleSave
    }

    const backButton = {
        title : "Back",
        onClick : handleBack
    }

    const editButton = {
        title : "Edit",
        onClick : handleEdit
    }


    // Handle input changes
    const handleInputChange = (key) => (event) => {
        setFormData((prevData) => ({
            ...prevData,
            [key]: event.target.value,
        }));
    };

    // Split form data into two columns
    const allowedKeys = programmeIntakeFormFields.map(field => field.key);

    const entries = Object.entries(formData).filter(
    ([key, _]) => allowedKeys.includes(key)
    );
    const mid = Math.ceil(entries.length / 2);
    const leftEntries = entries.slice(0, mid);
    const rightEntries = entries.slice(mid);

    return (
        <div className="flex flex-col w-full">
            <Title>Programme Enrollment | {programmeEnrollment.programme_intake_code}</Title>
            <ProgrammeEnrollmentDisplayTable 
                leftEntries={leftEntries} 
                rightEntries={rightEntries} 
                handleInputChange={handleInputChange} 
                editMode={editMode}
            />
            <NavTab/>
            <ChildrenContent/>
            {editMode ?
                <ActionBar button1={cancelButton} button2={saveButton}/>
            :   
                <ActionBar button1={backButton} button2={editButton}/>
            }
        </div> 
    )
}

const NavTab = () => {
    return (
        <div className="flex gap-4 mt-2">
          <Link to="graduation-requirement">Graduation Requirement</Link>
          <Link to="course-plan">Course Plan</Link>
        </div>
    )
}

const ChildrenContent = () => {
    return (
      <div className="p-4">
        <Outlet />
      </div>
    )
}

const ProgrammeEnrollmentDisplayTable = ({ 
    leftEntries, 
    rightEntries, 
    handleInputChange, 
    editMode 
}) => {
    return (
        <div id="programme-enrollment-display-table" className="flex flex-row items-center justify-center w-[90%] ml-40">
            <ProgrammeEnrollmentDisplayColumn  // Left Column
                entries={leftEntries} 
                handleInputChange={handleInputChange} 
                editMode={editMode} 
            />
            <ProgrammeEnrollmentDisplayColumn // Right Column
                entries={rightEntries} 
                handleInputChange={handleInputChange} 
                editMode={editMode} 
            />
        </div>
    )
}

const ProgrammeEnrollmentDisplayColumn = ({ entries, handleInputChange, editMode }) => {
    const location = useLocation();

    return (
        <div className="w-1/2">
            {entries.map(([key, value]) => {
                const field = programmeIntakeFormFields.find((field) => field.key === key)
                if(!field) return
                if(field.type === "text") 
                    return (
                    <div id={`form-field-${field.key}`} className="h-[70px]">
                        <TextInputField 
                                label={field.label}
                                value={value}
                                onChange={handleInputChange(key)}
                                editMode={editMode}
                        />
                    </div>
                    )
                else if (field.type === "select")
                    return (
                        <div id={`form-field-${field.key}`}>
                            <SelectInputField 
                                label={field.label} 
                                options={field.options}
                                value={value}
                                onChange={handleInputChange(key)}
                                editMode={editMode}

                            />
                        </div>
                    )
            })}
        </div>
    );
};

export default ProgrammeEnrollmentDetails;