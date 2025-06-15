import React, { useEffect, useState, useMemo } from "react";
import { usePDF } from "react-to-pdf";
import axiosClient from "../../api/axiosClient";

const TranscriptView = () => {
  const [entries, setEntries] = useState([]);
  const { toPDF, targetRef } = usePDF({
    filename: "transcript.pdf",
    page: { margin: 20 },
    canvas: { mimeType: "image/png", qualityRatio: 1 },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded = JSON.parse(atob(token.split(".")[1]));
        const userId = decoded.user_id;
        if (!userId) return;

        const res = await axiosClient.get(`/academic-profile/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data;

        if (Array.isArray(data.entries)) {
          const mapped = data.entries.map((entry) => ({
            year: `Year ${entry.year}`,
            semester: `Semester ${entry.semester}`,
            code: entry.course.course_code,
            name: entry.course.course_name,
            credit: entry.course.credit_hours,
            grade: entry.grade,
            status: entry.status,
            isRetake:
              entry.isRetake === true && entry.status !== "Failed"
                ? true
                : false,
          }));

          setEntries(mapped);
        }
      } catch (error) {
        console.error("❌ Error fetching transcript data:", error);
      }
    };

    fetchData();
  }, []);

  const gradeToPoint = (grade) => {
    const scale = {
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
    return scale[grade] ?? null;
  };

  const calculateGradePoint = (entry) => {
    const credit = entry.credit || 0;
    const point = gradeToPoint(entry.grade) || 0;
    return (credit * point).toFixed(2);
  };

  const isFail = (entry) => entry.status === "Failed";

  const grouped = useMemo(() => {
    return entries.reduce((acc, curr) => {
      acc[curr.year] = acc[curr.year] || {};
      acc[curr.year][curr.semester] = acc[curr.year][curr.semester] || [];
      acc[curr.year][curr.semester].push(curr);
      return acc;
    }, {});
  }, [entries]);

  const calculateSemesterGPA = (courses) => {
    let totalPoints = 0;
    let totalCredits = 0;
    for (const course of courses) {
      const point = gradeToPoint(course.grade);
      if (point !== null) {
        totalPoints += point * course.credit;
        if (point > 0) totalCredits += course.credit; // exclude failed
      }
    }
    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : "-";
  };

  const latestPassedAttemptsMap = {};
  entries.forEach((entry) => {
    const point = gradeToPoint(entry.grade);
    if (point > 0 && entry.status === "Passed") {
      latestPassedAttemptsMap[entry.code] = entry; // keeps latest
    }
  });

  const latestPassedAttempts = Object.values(latestPassedAttemptsMap);

  const totalCredits = latestPassedAttempts.reduce(
    (sum, e) => sum + (e.credit || 0),
    0
  );
  const totalPoints = latestPassedAttempts.reduce(
    (sum, e) => sum + gradeToPoint(e.grade) * (e.credit || 0),
    0
  );
  const cgpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : "-";

  const allPassedCredits = entries.reduce((acc, entry) => {
    return isFail(entry) ? acc : acc + (entry.credit || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#1E3A8A]">Transcript View</h2>
          <button
            onClick={() => toPDF()}
            className="px-4 py-2 bg-[#1E3A8A] text-white rounded-md hover:bg-white hover:text-[#1E3A8A] border border-[#1E3A8A] transition-colors duration-300"
          >
            Download as PDF
          </button>
        </div>

        <div ref={targetRef} className="p-6 bg-white rounded-lg shadow-sm">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-gray-500 text-center">
              No transcript data available.
            </p>
          ) : (
            Object.entries(grouped).map(([year, semesters]) => (
              <div key={year} className="mb-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">
                  {year}
                </h3>
                {Object.entries(semesters).map(([semester, courses]) => {
                  const semesterGPA = calculateSemesterGPA(courses);
                  return (
                    <div key={semester} className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-medium text-gray-600">
                          {semester}
                        </h4>
                        <span className="text-gray-700 font-medium">
                          Semester GPA: {semesterGPA}
                        </span>
                      </div>

                      <table className="w-full bg-white shadow-md rounded-xl overflow-hidden mb-4">
                        <thead className="bg-gray-100 text-left">
                          <tr>
                            <th className="px-4 py-2 w-1/5">Course Code</th>
                            <th className="px-4 py-2 w-2/5">Course Name</th>
                            <th className="px-4 py-2 w-1/5">Credit</th>
                            <th className="px-4 py-2 w-1/5">Grade</th>
                            <th className="px-4 py-2 w-1/5">Grade Point</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courses.map((entry, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-4 py-2">
                                {entry.code}
                                {entry.isRetake && (
                                  <span className="ml-2 inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded">
                                    Retake
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-2">{entry.name || "-"}</td>
                              <td className="px-4 py-2">
                                {entry.credit || "-"}
                              </td>
                              <td className="px-4 py-2">{entry.grade}</td>
                              <td className="px-4 py-2">
                                {calculateGradePoint(entry)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          <div className="text-right text-lg font-semibold text-gray-700 mt-6">
            Total Credits: {allPassedCredits} | CGPA: {cgpa}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptView;
