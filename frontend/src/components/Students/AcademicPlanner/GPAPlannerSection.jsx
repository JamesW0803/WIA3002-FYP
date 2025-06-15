import React, { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import CurrentAcademicStatus from "./GPAPlanner/CurrentAcademicStatus";
import TargetGPACalculator from "./GPAPlanner/TargetGPACalculator";
import GPASimulator from "./GPASimulator";
import GPAVisualization from "./GPAVisualization";
import GPATipsSection from "./GPAPlanner/GPATipsSection";

// Map letter grades to points
const gradePointsMap = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  F: 0.0,
};

const GPAPlannerSection = () => {
  const [currentGPA, setCurrentGPA] = useState("0.00");
  const [completedCredits, setCompletedCredits] = useState("0");
  const [targetGPA, setTargetGPA] = useState("");
  const [plannedCredits, setPlannedCredits] = useState("");
  const [requiredGPA, setRequiredGPA] = useState(null);
  const [gpaCourses, setGpaCourses] = useState([
    { name: "", credit: "", grade: "" },
  ]);

  // Fetch transcript entries, compute CGPA and total credits
  useEffect(() => {
    const fetchTranscript = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      if (!token || !userId) return;
      try {
        const res = await axiosClient.get(`/academic-profile/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const entries = res.data.entries;
        let totalCredits = 0;
        let totalPoints = 0;
        entries.forEach((entry) => {
          if (entry.status === "Passed") {
            const creds = entry.course.credit_hours;
            const points = gradePointsMap[entry.grade] || 0;
            totalCredits += creds;
            totalPoints += creds * points;
          }
        });
        if (totalCredits > 0) {
          setCurrentGPA((totalPoints / totalCredits).toFixed(2));
        }
        setCompletedCredits(totalCredits.toString());
      } catch (err) {
        console.error("Failed to load transcript", err);
      }
    };

    fetchTranscript();
  }, []);

  const calculateRequiredGPA = () => {
    if (!currentGPA || !completedCredits || !targetGPA || !plannedCredits)
      return;
    const currentPoints = parseFloat(currentGPA) * parseFloat(completedCredits);
    const totalCredits =
      parseFloat(completedCredits) + parseFloat(plannedCredits);
    const requiredPoints = parseFloat(targetGPA) * totalCredits - currentPoints;
    setRequiredGPA(requiredPoints / parseFloat(plannedCredits));
  };

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-[#1E3A8A]/20">
      <h3 className="text-xl font-semibold mb-6 text-[#1E3A8A]">
        GPA Simulator & Planner
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <CurrentAcademicStatus
          currentGPA={currentGPA}
          setCurrentGPA={setCurrentGPA}
          completedCredits={completedCredits}
          setCompletedCredits={setCompletedCredits}
        />

        <TargetGPACalculator
          targetGPA={targetGPA}
          setTargetGPA={setTargetGPA}
          plannedCredits={plannedCredits}
          setPlannedCredits={setPlannedCredits}
          requiredGPA={requiredGPA}
          calculateRequiredGPA={calculateRequiredGPA}
        />
      </div>

      <GPASimulator
        gpaCourses={gpaCourses}
        setGpaCourses={setGpaCourses}
        currentGPA={currentGPA}
        completedCredits={completedCredits}
      />

      <GPAVisualization
        currentGPA={currentGPA}
        targetGPA={targetGPA}
        projectedGPA={(() => {
          const curr = parseFloat(currentGPA) * parseFloat(completedCredits);
          let newPoints = 0;
          let newCreds = 0;
          gpaCourses.forEach(({ credit, grade }) => {
            const c = parseFloat(credit);
            const p = gradePointsMap[grade] || 0;
            if (!isNaN(c)) {
              newCreds += c;
              newPoints += c * p;
            }
          });
          if (newCreds === 0) return "0.00";
          return (
            (curr + newPoints) /
            (parseFloat(completedCredits) + newCreds)
          ).toFixed(2);
        })()}
      />

      <GPATipsSection />
    </section>
  );
};

export default GPAPlannerSection;
