import axiosClient from "../../api/axiosClient"

const Dashboard = () => {

    const handleSubmit = async () => {
        try {
            axiosClient.get("/courses").then(
                (res) => {
                  console.log("Courses fetched successfully:", res.data);
                }).catch(
                (error) => {
                  console.error("Error get courses:", error);
                }
              );
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }


    return (
        <div className="dashboard">
            <h1 className="text-2xl font-bold">Faculty Dashboard</h1>
            <p>Welcome to the Faculty Dashboard!</p>
            {/* Add more content here as needed */}
            <button onClick={() => handleSubmit()}>
                Try API
            </button>
        </div>
    )
}

export default Dashboard;