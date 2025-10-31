import React, { useEffect, useState, useMemo } from "react";
import { usePDF } from "react-to-pdf";
import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/Students/PageHeader";

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

  // Latest attempts only (same behavior as your original)
  const latestAttemptsMap = {};
  entries.forEach((entry) => {
    const point = gradeToPoint(entry.grade);
    if (point !== null) {
      latestAttemptsMap[entry.code] = entry;
    }
  });
  const latestAttempts = Object.values(latestAttemptsMap);

  const totalCredits = latestAttempts.reduce(
    (sum, e) => sum + (gradeToPoint(e.grade) > 0 ? e.credit || 0 : 0),
    0
  );
  const totalPoints = latestAttempts.reduce(
    (sum, e) => sum + (gradeToPoint(e.grade) || 0) * (e.credit || 0),
    0
  );
  const cgpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : "-";

  useEffect(() => {
    if (!isNaN(cgpa) && cgpa !== "-") {
      localStorage.setItem("studentCGPA", cgpa);
    }
  }, [cgpa]);

  const allPassedCredits = entries.reduce((acc, entry) => {
    return isFail(entry) ? acc : acc + (entry.credit || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Transcript"
        subtitle="Your academic history, GPA by semester, and overall CGPA."
        actions={
          <button
            onClick={() => toPDF()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-[#1E3A8A] bg-[#1E3A8A] text-white hover:bg-white hover:text-[#1E3A8A] transition-colors"
          >
            Download PDF
          </button>
        }
      />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total Credits (Passed)</p>
            <p className="text-2xl font-semibold text-gray-800 mt-1">
              {allPassedCredits}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total Courses Count</p>
            <p className="text-2xl font-semibold text-gray-800 mt-1">
              {entries.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">CGPA</p>
            <p className="text-2xl font-semibold text-gray-800 mt-1">{cgpa}</p>
          </div>
        </div>

        {/* Printable area */}
        <div
          ref={targetRef}
          className="bg-white rounded-xl shadow-sm border border-gray-200"
        >
          <div className="p-4 sm:p-6">
            {Object.keys(grouped).length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="mx-auto mb-3 w-10 h-10 rounded-full border-4 border-gray-200"></div>
                  <p className="text-gray-500">
                    No transcript data available yet.
                  </p>
                </div>
              </div>
            ) : (
              Object.entries(grouped).map(([year, semesters]) => (
                <div key={year} className="mb-8 last:mb-0">
                  {/* Year header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                      {year}
                    </h3>
                  </div>

                  {Object.entries(semesters).map(([semester, courses]) => {
                    const semesterGPA = calculateSemesterGPA(courses);

                    return (
                      <section
                        key={semester}
                        className="mb-6 last:mb-0 rounded-lg border border-gray-200"
                      >
                        {/* Semester header */}
                        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200">
                          <h4 className="text-base sm:text-lg font-medium text-gray-700">
                            {semester}
                          </h4>
                          <div className="inline-flex items-center gap-2">
                            <span className="text-sm text-gray-600">GPA</span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {semesterGPA}
                            </span>
                          </div>
                        </header>

                        {/* Desktop / Tablet table */}
                        <div className="hidden md:block">
                          <table className="w-full">
                            <thead className="bg-white">
                              <tr className="text-left text-sm text-gray-600 border-b">
                                <th className="px-5 py-3 w-1/5">Course Code</th>
                                <th className="px-5 py-3 w-2/5">Course Name</th>
                                <th className="px-5 py-3 w-1/5">Credit</th>
                                <th className="px-5 py-3 w-1/5">Grade</th>
                                <th className="px-5 py-3 w-1/5">Grade Point</th>
                              </tr>
                            </thead>
                            <tbody>
                              {courses.map((entry, idx) => (
                                <tr
                                  key={idx}
                                  className="border-t text-sm text-gray-800"
                                >
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">
                                        {entry.code}
                                      </span>
                                      {entry.isRetake && (
                                        <span className="inline-block bg-yellow-100 text-yellow-800 text-[11px] font-semibold px-2 py-0.5 rounded">
                                          Retake
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    {entry.name || "-"}
                                  </td>
                                  <td className="px-5 py-3">
                                    {entry.credit || "-"}
                                  </td>
                                  <td className="px-5 py-3">{entry.grade}</td>
                                  <td className="px-5 py-3">
                                    {calculateGradePoint(entry)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden divide-y">
                          {courses.map((entry, idx) => (
                            <div key={idx} className="px-4 py-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-gray-800">
                                      {entry.code}
                                    </p>
                                    {entry.isRetake && (
                                      <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                        Retake
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-600 text-sm mt-0.5">
                                    {entry.name || "-"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs ${
                                      entry.status === "Passed"
                                        ? "bg-green-100 text-green-800"
                                        : entry.status === "Failed"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {entry.status}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                                  <p className="text-[11px] text-gray-500">
                                    Credit
                                  </p>
                                  <p className="font-medium">
                                    {entry.credit || "-"}
                                  </p>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                                  <p className="text-[11px] text-gray-500">
                                    Grade
                                  </p>
                                  <p className="font-medium">{entry.grade}</p>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                                  <p className="text-[11px] text-gray-500">
                                    Grade Point
                                  </p>
                                  <p className="font-medium">
                                    {calculateGradePoint(entry)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer summary (prints nicely) */}
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-gray-600">
              Showing latest attempts per course for CGPA computation.
            </div>
            <div className="text-right sm:text-base font-semibold text-gray-800">
              Total Credits: {allPassedCredits} &nbsp;|&nbsp; CGPA: {cgpa}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptView;
