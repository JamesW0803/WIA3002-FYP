import { useState, useEffect } from "react";
import Table from "../../../components/table/Table";
import axiosClient from "../../../api/axiosClient";
import Title from "../../../components/Title";
import ToolBar from "../../../components/table/ToolBar"
import Divider from '@mui/material/Divider';
import { useNavigate } from "react-router-dom";

const ManageProgrammes = () => {
    const navigate = useNavigate();

    const [programmes, setProgrammes] = useState([]);
    const [items, setItems] = useState([]);
    const [clickableItems, setClickableItems] = useState(["programme_code"])

    const header = ["Programme Code", "Programme Name", "Department", "Faculty", "Actions"]
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
    })
    
    useEffect(() => {
        const latestItem = programmes.map((programme) => {
            return  (
                Object.entries(programme).map(([key, value]) => {
                    return {
                        key,
                        value,
                        type: clickableItems.includes(key) ? "clickable_text_display" : "text_display",
                        onClick : clickableItems.includes(key) ? () => handleProgrammeOnClick(programme)  : null
                    }
                })
            )
        })
        setItems(latestItem);
    }, [programmes])

    const handleProgrammeOnClick = (programme) => {
        // navigate to student details page
        navigate(`/admin/programmes/${programme.programme_code}`, { state : { programme }})
    }

    return (
        <div className="programmesPage">
            <Title>Programmes</Title>
            <Divider sx={{ marginX: 5 }} />
            <ToolBar/>            <Table
                header={header}
                items={items}
                order={order}
                // index={false}
            />
        </div> 



    )
}

export default ManageProgrammes;