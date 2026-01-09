import { useState, useEffect } from "react";
import Table from "../../../components/table/Table";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import ToolBar from "../../../components/table/ToolBar"
import Divider from '@mui/material/Divider';
import FormDialog from "../../../components/dialog/FormDialog"
import { useNavigate, useLocation } from "react-router-dom";
import Notification from "../../../components/Students/AcademicProfile/Notification";
import { useAcademicProfile } from "../../../hooks/useAcademicProfile";
import { compareAcademicSessions } from "../../../utils/compareAcademicSession";

const ManageProgrammeEnrollment = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [programmeEnrollments, setProgrammeEnrollments] = useState([]);
    const [items, setItems] = useState([]);
    const [clickableItems, setClickableItems] = useState(["programme_intake_code"])

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedProgrammeIntakeCodeToDelete, setSelectedProgrammeIntakeCodeToDelete] = useState(null);
        
    const [searchKeywords, setSearchKeywords] = useState("");
    const [loading, setLoading] = useState(true);

    const header = ["Programme Enrollment Code", "Programme Name", "Enrollment Year", "Enrollment Semester"]
    const order = ["programme_intake_code", "programme_name", "year", "semester"]

    const [currentAcademicSession, setCurrentAcademicSession] = useState(null);

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
        const fetchProgrammeEnrollments = async () => {
            try {
                await axiosClient.get("/programme-intakes/refresh");
                const response = await axiosClient.get("/programme-intakes");
                const programmeEnrollments = response.data;
                setProgrammeEnrollments(programmeEnrollments)
            } catch (error) {
                console.error("Error fetching programme enrollment: ", error);
            }finally{
                setLoading(false);
            }
        };
        fetchProgrammeEnrollments();
    },[])

    useEffect(() => {
        const fetchCurrentAcademicSession = async () => {
            try {
                const response = await axiosClient.get("/academic-sessions/current");
                setCurrentAcademicSession(response.data)
            } catch (error) {
                console.error("Error fetching current academic session: ", error);
            }finally{
                setLoading(false);
            }
        };
        fetchCurrentAcademicSession();
    },[])


    /**
     * courses = [course1, course2, course3]
     * course = [[course_code, "dsa"], [course_code, "sadad"]]
    */
    useEffect(() => {
        const latestItem = programmeEnrollments.map((programmeEnrollment) => {
            const isEditable = compareAcademicSessions(programmeEnrollment.academic_session, currentAcademicSession).isAfter || false

            return  (
                Object.entries(programmeEnrollment).map(([key, value]) => {
                    return {
                        key,
                        value,
                        type: clickableItems.includes(key) ? "clickable_text_display" : "text_display",
                        onClick : clickableItems.includes(key) ? () => handleProgrammeEnrollmentOnClick(programmeEnrollment.programme_intake_code)  : null,
                        isEditable
                    }
                })
            )
        })
        setItems(latestItem);
    }, [programmeEnrollments])

    useEffect( () => {
        if(searchKeywords === ""){
            const fetchProgrammeEnrollments = async () => {
                try {
                    const response = await axiosClient.get("/programme-intakes");
                    const programmeEnrollments = response.data;
                    setProgrammeEnrollments(programmeEnrollments)
                } catch (error) {
                    console.error("Error fetching programme enrollment: ", error);
                }
            };
            fetchProgrammeEnrollments();
        }else{
            const fetchProgrammeEnrollments = async () => {
                try {
                    const response = await axiosClient.get("/programme-intakes");
                    const programmeEnrollments = response.data;
                    const lowerSearch = searchKeywords.toLowerCase();
                    const filteredProgrammeEnrollments = programmeEnrollments.filter( programmeEnrollment => 
                        programmeEnrollment.programme_intake_code.toLowerCase().includes(lowerSearch) ||
                        programmeEnrollment.programme_name.toLowerCase().includes(lowerSearch)
                    )
                    setProgrammeEnrollments(filteredProgrammeEnrollments);
                } catch (error) {
                    console.error("Error fetching programme enrollment: ", error);
                }
            };
            fetchProgrammeEnrollments();
        }
    }, [searchKeywords])
    
    const handleProgrammeEnrollmentOnClick = (programme_intake_code) => {
        navigate(`/admin/programme-intakes/${programme_intake_code}`, { state : { programme_intake_code , editMode : false }})
    }

    const handleEditButtonOnClick = (programme_intake_code) => {
        navigate(`/admin/programme-intakes/${programme_intake_code}`, { state : { programme_intake_code , editMode : true }})
    }

    const handleButtonAddProgrammeEnrollmentOnClick = () => {
        navigate(`/admin/programme-intakes/add-programme-intake`, { state : { programmeEnrollments , addProgrammeIntake : true} })
    }

    const handleDeleteButtonOnClick = (programme_intake_code) => {
        setSelectedProgrammeIntakeCodeToDelete(programme_intake_code);
        setOpenDialog(true);
    }

    const confirmDeleteProgrammeEnrollment = async () => {
        try {
            const response = await axiosClient.delete(`/programme-intakes/${selectedProgrammeIntakeCodeToDelete}`);
            showNotification("Programme enrollment is removed successfully", "success")
            setProgrammeEnrollments(prev => prev.filter(programmeEnrollment => programmeEnrollment.programme_intake_code !== selectedProgrammeIntakeCodeToDelete));
        } catch (error) {
            showNotification("Error removing programme enrollment", "error")
            console.error("Error deleting programme enrollment:", error);
        } finally {
            setOpenDialog(false);
            setSelectedProgrammeIntakeCodeToDelete(null);
        }
    };

    const programmeEnrollmentsActionBar = {
        viewButton : {
            onClick : handleProgrammeEnrollmentOnClick
        },
        editButton : {
            onClick : handleEditButtonOnClick
        },
        deleteButton : {
            onClick : handleDeleteButtonOnClick
        }
    }

    const handleSearchKeywordsChange = (e) => {
        setSearchKeywords(e.target.value)
    }

    return (
        <div className="programme-enrollments-page">
            <Title>Programme Enrollment</Title>
            <Divider sx={{ marginX: 5 }} />
            <ToolBar
                searchBar = {{
                    searchKeywords : searchKeywords,
                    onChange : handleSearchKeywordsChange
                }}

                button = {{
                    title : "Add programme enrollment",
                    onClick : handleButtonAddProgrammeEnrollmentOnClick
                }}
            />
            <Table
                header={header}
                items={items}
                order={order}
                tableActionBarButton={programmeEnrollmentsActionBar}
                identifier={"programme_intake_code"}
                loading={loading}
                // index={false}
            />
            <FormDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                onConfirm={confirmDeleteProgrammeEnrollment}
                title="Delete programme enrollment"
                content={`Are you sure you want to delete programme enrollment with code "${selectedProgrammeIntakeCodeToDelete}"?`}
                confirmText="Delete"
                cancelText="Cancel"
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

export default ManageProgrammeEnrollment;