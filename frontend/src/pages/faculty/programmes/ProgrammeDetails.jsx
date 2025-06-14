import { useLocation, useNavigate } from "react-router-dom";
import Title from "../../../components/Title";
import { useState , useEffect } from "react"
import axiosClient from "../../../api/axiosClient";
import ActionBar from "../../../components/form/ActionBar";
import TextInputField from "../../../components/form/TextInputField";
import SelectInputField from "../../../components/form/SelectInputField";
import { programmeFormFields } from "../../../constants/programmeFormConfig"

const ProgrammeDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const programme_code  = location.state.programme_code
    const [editMode, setEditMode] = useState(location.state?.editMode || false);
    const [programme, setProgramme] = useState({})
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const fetchProgramme = async() => {
            const response = await axiosClient.get(`/programmes/${programme_code}`)
            const currentProgramme = response.data

            setProgramme(currentProgramme)
            setFormData(currentProgramme); // initial form data

        }
        fetchProgramme()
    }, [programme_code])

    const handleBack = () => {
        navigate(`/admin/programmes`)
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

            const response = await axiosClient.put(`/programmes/${formData.programme_code}`, payload);
            const updatedProgramme = response.data
            setEditMode(false)
            console.log("Programme is updated successfully")
        } catch (error) {
            console.error("Error updating programme: ", error);
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
    const entries = Object.entries(formData);

    return (
        <div className="flex flex-col w-full">
            <Title>Programme | {programme.programme_code}</Title>
            <CourseDisplayColumn 
                entries={entries}
                handleInputChange={handleInputChange} 
                editMode={editMode}
            />
            {editMode ?
                <ActionBar button1={cancelButton} button2={saveButton}/>
            :   
                <ActionBar button1={backButton} button2={editButton}/>
            }
        </div> 
    )
}

const CourseDisplayColumn = ({ entries, handleInputChange, editMode }) => {
    const location = useLocation();

    return (
        <div className="w-1/2">
            {entries.map(([key, value]) => {
                const field = programmeFormFields.find((field) => field.key === key)
                if(field.type === "text") 
                    return (
                    <div id={`form-field-${field.key}`}>
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

export default ProgrammeDetails;