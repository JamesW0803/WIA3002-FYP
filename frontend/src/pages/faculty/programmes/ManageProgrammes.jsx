import { useState, useEffect } from "react";
import Table from "../../../components/table/Table";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import ToolBar from "../../../components/table/ToolBar"
import Divider from '@mui/material/Divider';
import FormDialog from "../../../components/dialog/FormDialog"
import AddProgrammeModal from "../../../components/form/AddProgrammeModal";
import { useNavigate } from "react-router-dom";

const ManageProgrammes = () => {
    const navigate = useNavigate();

    const [programmes, setProgrammes] = useState([]);
    const [items, setItems] = useState([]);
    const [clickableItems, setClickableItems] = useState(["programme_code"])

    const [openModal, setOpenModal] = useState(false);
    const [formData, setFormData] = useState({
        programme_name : "",
        programme_code : "",
        description : "",
        faculty : null,
        department : null
    });
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedProgrammeCodeToDelete, setSelectedProgrammeCodeToDelete] = useState(null);

    const header = ["Programme Code", "Programme Name", "Department", "Faculty"]
    const order = ["programme_code", "programme_name", "department", "faculty"]

    useEffect(() => {
        const fetchProgrammes = async () => {
            try {
                const response = await axiosClient.get("/programmes");
                const programmes = response.data;
                setProgrammes(programmes);
            } catch (error) {
                console.error("Error fetching programmes: ", error);
            }
        };
        fetchProgrammes();
    }, [])
    
    useEffect(() => {
        const latestItem = programmes.map((programme) => {
            return  (
                Object.entries(programme).map(([key, value]) => {
                    return {
                        key,
                        value,
                        type: clickableItems.includes(key) ? "clickable_text_display" : "text_display",
                        onClick : clickableItems.includes(key) ? () => handleProgrammeOnClick(programme.programme_code)  : null
                    }
                })
            )
        })
        setItems(latestItem);
    }, [programmes])

    const handleProgrammeOnClick = (programme_code) => {
        navigate(`/admin/programmes/${programme_code}`, { state : { programme_code , editMode : false }})
    }

    const handleEditButtonOnClick = (programme_code) => {
        navigate(`/admin/programmes/${programme_code}`, { state : { programme_code , editMode : true }})
    }

    const handleButtonAddProgrammeOnClick = () => {
        setOpenModal(true)
    }

    const handleSaveNewProgramme = async() => {
        try {
            const response = await axiosClient.post("/programmes", formData);
            const newAddedProgramme = response.data
            setProgrammes(prev => [...prev, newAddedProgramme]);
            console.log("Programme is added successfully")
        } catch (error) {
            console.error("Error adding programme: ", error);
        } finally {
            setOpenModal(false)
            setFormData({
                programme_name : "",
                programme_code : "",
                description : "",
                faculty : null,
                department : null
            })
        }              
    }

    const handleOnClose = () => {
        setOpenModal(false)
        setFormData({
            programme_name : "",
            programme_code : "",
            description : "",
            faculty : null,
            department : null
        })
    }

    const handleDeleteButtonOnClick = (programme_code) => {
        setSelectedProgrammeCodeToDelete(programme_code);
        setOpenDialog(true);
    }

    const confirmDeleteProgramme = async () => {
        try {
            const response = await axiosClient.delete(`/programmes/${selectedProgrammeCodeToDelete}`);
            setProgrammes(prev => prev.filter(programme => programme.programme_code !== selectedProgrammeCodeToDelete));
        } catch (error) {
            console.error("Error deleting programme:", error);
        } finally {
            setOpenDialog(false);
            setSelectedProgrammeCodeToDelete(null);
        }
    };

    const programmesActionBar = {
        viewButton : {
            onClick : handleProgrammeOnClick
        },
        editButton : {
            onClick : handleEditButtonOnClick
        },
        deleteButton : {
            onClick : handleDeleteButtonOnClick
        }
    }

    const handleInputChange = (key) => (event) => {
        const value = event.target?.value ?? event; // supports both normal and custom selects
        setFormData((prevData) => ({
            ...prevData,
            [key]: value,
        }));
    };

    return (
        <div className="programmesPage">
            <Title>Programmes</Title>
            <Divider sx={{ marginX: 5 }} />
            <ToolBar
                button = {{
                    title : "Add Programme",
                    onClick : handleButtonAddProgrammeOnClick
                }}
            />
            <Table
                header={header}
                items={items}
                order={order}
                tableActionBarButton={programmesActionBar}
                identifier={"programme_code"}
                // index={false}
            />
            <FormDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                onConfirm={confirmDeleteProgramme}
                title="Delete Programme"
                content={`Are you sure you want to delete programme with code "${selectedProgrammeCodeToDelete}"?`}
                confirmText="Delete"
                cancelText="Cancel"
            />
            <AddProgrammeModal
                open={openModal}
                onClose={handleOnClose}
                onSave={handleSaveNewProgramme}
                formData={formData}
                handleInputChange={handleInputChange}
            />
        </div> 



    )
}

export default ManageProgrammes;