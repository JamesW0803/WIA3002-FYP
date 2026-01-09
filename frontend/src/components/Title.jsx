import axiosClient from "../api/axiosClient";
import { useState, useEffect } from "react";

const Title = ({ children }) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between m-5 ml-10">
      <h1 className="text-2xl font-bold text-gray-800">{children}</h1>
      <CurrentAcademicSession />
    </div>
  );
};

const CurrentAcademicSession = () => {
  const [currentSession, setCurrentSession] = useState(null);

  useEffect(() => {
    const fetchCurrentSession = async () => {
      try {
        const res = await axiosClient.get("/academic-sessions/current");
        setCurrentSession(res.data);
      } catch (err) {
        console.error("Error fetching current academic session:", err);
      }
    };

    fetchCurrentSession();
  }, []);

  if (!currentSession) return null;

  return (
    <div className="mt-2 md:mt-0 flex items-center">
      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full shadow-sm text-sm font-medium">
        Current Session: {currentSession.year} - {currentSession.semester}
      </span>
    </div>
  );
};

export default Title;
