import { useState, useEffect } from "react";
import Table from "../../../components/table/Table";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import ToolBar from "../../../components/table/ToolBar"
import Divider from '@mui/material/Divider';
import FormDialog from "../../../components/dialog/FormDialog"
import { useNavigate } from "react-router-dom";

const ManageProgrammeEnrollment = () => {
    const navigate = useNavigate();

    const [programmeEnrollments, setProgrammeEnrollments] = useState([]);
    const [items, setItems] = useState([]);
    const [clickableItems, setClickableItems] = useState(["programme_intake_code"])

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedProgrammeIntakeCodeToDelete, setSelectedProgrammeIntakeCodeToDelete] = useState(null);
        
    const [searchKeywords, setSearchKeywords] = useState("");

    const header = ["Programme Enrollment Code", "Programme Name", "Enrollment Year", "Enrollment Semester"]
    const order = ["programme_intake_code", "programme_name", "year", "semester"]
    
    useEffect(() => {
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
    },[])


    /**
     * courses = [course1, course2, course3]
     * course = [[course_code, "dsa"], [course_code, "sadad"]]
    */
    useEffect(() => {
        const latestItem = programmeEnrollments.map((programmeEnrollment) => {
            return  (
                Object.entries(programmeEnrollment).map(([key, value]) => {
                    return {
                        key,
                        value,
                        type: clickableItems.includes(key) ? "clickable_text_display" : "text_display",
                        onClick : clickableItems.includes(key) ? () => handleProgrammeEnrollmentOnClick(programmeEnrollment.programme_intake_code)  : null
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
        // navigate to course page
        navigate(`/admin/programme-intakes/${programme_intake_code}`, { state : { programme_intake_code , editMode : false }})
    }

    const handleEditButtonOnClick = (programme_intake_code) => {
        // navigate to course page
        navigate(`/admin/programme-intakes/${programme_intake_code}`, { state : { programme_intake_code , editMode : true }})
    }

    const handleButtonAddProgrammeEnrollmentOnClick = () => {
        navigate(`/admin/programme-intakes/add-programme-intake`, { state : { programmeEnrollments }})
    }

    const handleDeleteButtonOnClick = (programme_intake_code) => {
        setSelectedProgrammeIntakeCodeToDelete(programme_intake_code);
        setOpenDialog(true);
    }

    const confirmDeleteProgrammeEnrollment = async () => {
        try {
            const response = await axiosClient.delete(`/programme-intakes/${selectedProgrammeIntakeCodeToDelete}`);
            setProgrammeEnrollments(prev => prev.filter(programmeEnrollment => programmeEnrollment.programme_intake_code !== selectedProgrammeIntakeCodeToDelete));
        } catch (error) {
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
        // editButton : {
        //     onClick : handleEditButtonOnClick
        // },
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
        </div> 
    )
}

export default ManageProgrammeEnrollment;