import { useState, useEffect } from "react";
import Table from "../../components/Table";
import axiosClient from "../../api/axiosClient";

const ManageProgrammes = () => {
    const [programmes, setProgrammes] = useState([]);
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
    

    return (
        <div className="programmesPage">
            <h1 className="text-2xl font-bold">Programmes</h1>
            <Table
                header={header}
                data={programmes}
                order={order}
                // index={false}
            />
        </div> 



    )
}

export default ManageProgrammes;