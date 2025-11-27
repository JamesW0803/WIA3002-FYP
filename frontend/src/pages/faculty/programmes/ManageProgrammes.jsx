import { useState, useEffect } from "react";
import Table from "../../../components/table/Table";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import ToolBar from "../../../components/table/ToolBar"
import Divider from '@mui/material/Divider';
import FormDialog from "../../../components/dialog/FormDialog"
import AddProgrammeModal from "../../../components/form/AddProgrammeModal";
import { useNavigate, useLocation } from "react-router-dom";
import { ALL_SHORT_FORMS } from "../../../constants/shortForm";
import Notification from "../../../components/Students/AcademicProfile/Notification";
import { useAcademicProfile } from "../../../hooks/useAcademicProfile";

const ManageProgrammes = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [programmes, setProgrammes] = useState([]);
    const [items, setItems] = useState([]);
    const [clickableItems, setClickableItems] = useState(["programme_code", "programme_name"])
    const short_forms = ["faculty","programme_name"]

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

    const [searchKeywords, setSearchKeywords] = useState("");
    const [loading, setLoading] = useState(true);

    const header = ["Programme Code", "Programme Name", "Department", "Faculty"]
    const order = ["programme_code", "programme_name", "department", "faculty"]
    const { 
        showNotification , 
        closeNotification,
        notification,
    } = useAcademicProfile()
    
    useEffect(() => {
        if (location.state?.notificationMessage) {
        const { notificationMessage, notificationType } = location.state;

        showNotification(notificationMessage, notificationType);

        // Clear the state so the page won’t show the notification on refresh
        navigate(location.pathname, { replace: true });
        }
    }, []);

    useEffect(() => {
        const fetchProgrammes = async () => {
            try {
                const response = await axiosClient.get("/programmes");
                const programmes = response.data;
                setProgrammes(programmes);
            } catch (error) {
                console.error("Error fetching programmes: ", error);
            }finally{
                setLoading(false);
            }
        };
        fetchProgrammes();
    }, [])
    
    useEffect(() => {
        const latestItem = programmes.map((programme) => {
            return  (
                Object.entries(programme).map(([key, value]) => {
                    if(short_forms.includes(key)){
                        value = ALL_SHORT_FORMS[value] || value;
                    }
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

    useEffect( () => {
        if(searchKeywords === ""){
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
        }else{
            const fetchProgrammes = async () => {
                try {
                    const response = await axiosClient.get("/programmes");
                    const programmes = response.data;
                    const lowerSearch = searchKeywords.toLowerCase();
                    const filteredProgrammes = programmes.filter( programmes => 
                        programmes.programme_name.toLowerCase().includes(lowerSearch) ||
                        programmes.programme_code.toLowerCase().includes(lowerSearch)
                    )
                    setProgrammes(filteredProgrammes);
                } catch (error) {
                    console.error("Error fetching programmes: ", error);
                }
            };
            fetchProgrammes();
        }
    }, [searchKeywords])

    const handleProgrammeOnClick = (programme_code) => {
        navigate(`/admin/programmes/${programme_code}`, { state : { programme_code , editMode : false }})
    }

    const handleEditButtonOnClick = (programme_code) => {
        navigate(`/admin/programmes/${programme_code}`, { state : { programme_code , editMode : true }})
    }

    const handleButtonAddProgrammeOnClick = () => {
        navigate("/admin/programmes/add-programme" , { state : { addProgramme : true}});
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
            showNotification("Programme is removed successfully", "success")
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

    const handleSearchKeywordsChange = (e) => {
        setSearchKeywords(e.target.value)
    }

    return (
        <div className="programmesPage">
            <Title>Programmes</Title>
            <Divider sx={{ marginX: 5 }} />
            <ToolBar
                searchBar = {{
                    searchKeywords : searchKeywords,
                    onChange : handleSearchKeywordsChange
                }}

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
                loading={loading}
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
            {notification.show && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    isClosing={notification.isClosing}
                    onClose={closeNotification}
                />
            )}
        </div> 



    )
}

export default ManageProgrammes;