import React, { useEffect, useState } from "react";
import { usePDF } from "react-to-pdf";

const TranscriptView = () => {
  const [entries, setEntries] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const { toPDF, targetRef } = usePDF({
    filename: "transcript.pdf",
    page: { margin: 20 },
    canvas: { mimeType: "image/png", qualityRatio: 1 },
  });

  useEffect(() => {
    const mockCourses = [
      { code: "WIX1002", name: "Fundamentals of Programming", credit: 5 },
      { code: "WIA1002", name: "Data Structure", credit: 5 },
      { code: "GIG1012", name: "Philosophy and Current Issues", credit: 2 },
      { code: "WIX1003", name: "Database Systems", credit: 4 },
      { code: "WIX2001", name: "Computer Networks", credit: 4 },
      { code: "WIX2002", name: "Operating Systems", credit: 4 },
      { code: "WIX3001", name: "Software Engineering", credit: 5 },
      { code: "WIX3002", name: "Artificial Intelligence", credit: 4 },
      { code: "MPU3113", name: "Ethnic Relations", credit: 3 },
      { code: "MPU3123", name: "Islamic Civilization", credit: 3 },
      { code: "WIX4001", name: "Final Year Project", credit: 8 },
      { code: "WIX4002", name: "Machine Learning", credit: 4 },
    ];

    const mockEntries = [
      {
        year: "Year 1",
        semester: "Semester 1",
        code: "WIX1002",
        status: "Passed",
        grade: "A",
      },
      {
        year: "Year 1",
        semester: "Semester 1",
        code: "GIG1012",
        status: "Passed",
        grade: "B+",
      },
      {
        year: "Year 1",
        semester: "Semester 2",
        code: "WIA1002",
        status: "Passed",
        grade: "A-",
      },
      {
        year: "Year 1",
        semester: "Semester 2",
        code: "WIX1003",
        status: "Passed",
        grade: "B",
      },
      {
        year: "Year 1",
        semester: "Semester 2",
        code: "MPU3113",
        status: "Passed",
        grade: "A",
      },
      {
        year: "Year 2",
        semester: "Semester 1",
        code: "WIX2001",
        status: "Passed",
        grade: "B+",
      },
      {
        year: "Year 2",
        semester: "Semester 1",
        code: "WIX2002",
        status: "Passed",
        grade: "A-",
      },
      {
        year: "Year 2",
        semester: "Semester 2",
        code: "WIX3001",
        status: "Passed",
        grade: "A",
      },
      {
        year: "Year 2",
        semester: "Semester 2",
        code: "MPU3123",
        status: "Passed",
        grade: "B+",
      },
      {
        year: "Year 3",
        semester: "Semester 1",
        code: "WIX3002",
        status: "Passed",
        grade: "A-",
      },
      {
        year: "Year 3",
        semester: "Semester 1",
        code: "WIX4001",
        status: "In Progress",
        grade: "-",
      },
      {
        year: "Year 3",
        semester: "Semester 2",
        code: "WIX4002",
        status: "Planned",
        grade: "-",
      },
    ];

    setAvailableCourses(mockCourses);
    setEntries(mockEntries);
  }, []);

  const gradeToPoint = (grade) => {
    const scale = {
      A: 4.0,
      "A-": 3.7,
      "B+": 3.3,
      B: 3.0,
      "B-": 2.7,
      "C+": 2.3,
      C: 2.0,
      "C-": 1.7,
      D: 1.0,
      F: 0.0,
    };
    return scale[grade] || null;
  };

  const passedEntries = entries.filter((e) => e.status === "Passed");

  // Group by year, then by semester
  const grouped = passedEntries.reduce((acc, curr) => {
    acc[curr.year] = acc[curr.year] || {};
    acc[curr.year][curr.semester] = acc[curr.year][curr.semester] || [];
    acc[curr.year][curr.semester].push(curr);
    return acc;
  }, {});

  // Calculate GPA for a semester
  const calculateSemesterGPA = (semesterCourses) => {
    const { totalCredits, totalPoints } = semesterCourses.reduce(
      (acc, entry) => {
        const course = availableCourses.find((c) => c.code === entry.code);
        const point = gradeToPoint(entry.grade);
        if (course && point !== null) {
          acc.totalCredits += course.credit;
          acc.totalPoints += course.credit * point;
        }
        return acc;
      },
      { totalCredits: 0, totalPoints: 0 }
    );
    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : "-";
  };

  // Calculate overall CGPA
  const totalCredits = passedEntries.reduce((sum, entry) => {
    const course = availableCourses.find((c) => c.code === entry.code);
    return sum + (course?.credit || 0);
  }, 0);

  const totalPoints = passedEntries.reduce((sum, entry) => {
    const course = availableCourses.find((c) => c.code === entry.code);
    const point = gradeToPoint(entry.grade);
    return sum + (course?.credit || 0) * (point || 0);
  }, 0);

  const cgpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : "-";

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
          {Object.entries(grouped).map(([year, semesters]) => (
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
                        {courses.map((entry, idx) => {
                          const course =
                            availableCourses.find(
                              (c) => c.code === entry.code
                            ) || {};
                          return (
                            <tr key={idx} className="border-t">
                              <td className="px-4 py-2">{entry.code}</td>
                              <td className="px-4 py-2">
                                {course.name || "-"}
                              </td>
                              <td className="px-4 py-2">
                                {course.credit || "-"}
                              </td>
                              <td className="px-4 py-2">{entry.grade}</td>
                              <td className="px-4 py-2">
                                {gradeToPoint(entry.grade) ?? "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="text-right text-lg font-semibold text-gray-700 mt-6">
            Total Credits: {totalCredits} | CGPA: {cgpa}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptView;
