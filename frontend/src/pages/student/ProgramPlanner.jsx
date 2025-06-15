import React, { useState, useEffect } from "react";
import PlanCard from "../../components/Students/PlanCard";
import { Button } from "../../components/ui/button";
import axiosClient from "../../api/axiosClient";

const ProgramPlanner = () => {
  const [plans, setPlans] = useState([]);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [completedCoursesBySemester, setCompletedCoursesBySemester] = useState(
    {}
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded = JSON.parse(atob(token.split(".")[1]));
        const userId = decoded.user_id;

        const profileRes = await axiosClient.get(
          `/academic-profile/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const profileData = profileRes.data;

        const bySemester = {};
        profileData.entries.forEach((entry) => {
          const key = `Year ${entry.year} - Semester ${entry.semester}`;
          if (!bySemester[key]) {
            bySemester[key] = [];
          }
          bySemester[key].push({
            ...entry.course,
            code: entry.course.course_code,
            credit: entry.course.credit_hours,
            status: entry.status,
            grade: entry.grade,
          });
        });
        setCompletedCoursesBySemester(bySemester);

        const completedCodes = profileData.entries.map(
          (e) => e.course.course_code
        );
        setCompletedCourses(completedCodes);

        const coursesRes = await axiosClient.get("/courses", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const coursesData = await coursesRes.json();
        setAllCourses(
          coursesData.map((course) => ({
            ...course,
            code: course.course_code,
            credit: course.credit_hours,
          }))
        );

        setPlans([
          {
            id: 1,
            name: "Plan A - On Time",
            years: createInitialYears(profileData.entries),
          },
        ]);
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };

    fetchData();
  }, []);

  const addPlan = () => {
    if (plans.length >= 3) return alert("Max 3 plans allowed.");

    const newPlan = {
      id: Date.now(),
      name: `Plan ${String.fromCharCode(65 + plans.length)}`,
      years: [
        {
          year: 1,
          semesters: [
            {
              id: Date.now(),
              name: "Year 1 - Semester 1",
              courses: [],
              completed: false,
            },
            {
              id: Date.now() + 1,
              name: "Year 1 - Semester 2",
              courses: [],
              completed: false,
            },
          ],
        },
      ],
    };

    setPlans([...plans, newPlan]);
  };

  const addYear = (planId) => {
    setPlans(
      plans.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              years: [
                ...plan.years,
                {
                  year: plan.years.length + 1,
                  semesters: [
                    {
                      id: Date.now(),
                      name: `Year ${plan.years.length + 1} - Semester 1`,
                      courses: [],
                      completed: false,
                    },
                    {
                      id: Date.now() + 1,
                      name: `Year ${plan.years.length + 1} - Semester 2`,
                      courses: [],
                      completed: false,
                    },
                  ],
                },
              ],
            }
          : plan
      )
    );
  };

  const deleteYear = (planId, yearToDelete) => {
    setPlans(
      plans.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              years: plan.years
                .filter((year) => year.year !== yearToDelete)
                .map((year, index) => ({
                  ...year,
                  year: index + 1, // Re-number years
                  semesters: year.semesters.map((semester) => ({
                    ...semester,
                    name: `Year ${index + 1} - Semester ${
                      semester.name.split(" ")[3]
                    }`,
                  })),
                })),
            }
          : plan
      )
    );
  };

  const createInitialYears = (entries) => {
    const yearsMap = {};

    entries.forEach((entry) => {
      const year = entry.year;
      if (!yearsMap[year]) {
        yearsMap[year] = {
          year,
          semesters: [
            {
              id: `${year}-1`,
              name: `Year ${year} - Semester 1`,
              courses: [],
              completed: false,
            },
            {
              id: `${year}-2`,
              name: `Year ${year} - Semester 2`,
              courses: [],
              completed: false,
            },
          ],
        };
      }

      const semesterIndex = entry.semester === 1 ? 0 : 1;
      yearsMap[year].semesters[semesterIndex].courses.push({
        ...entry.course,
        code: entry.course.course_code,
        credit: entry.course.credit_hours,
        status: entry.status,
        grade: entry.grade,
      });
      yearsMap[year].semesters[semesterIndex].completed = true;
    });

    return Object.values(yearsMap).sort((a, b) => a.year - b.year);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Program Planner</h2>
        <Button onClick={addPlan}>Add Program Plan</Button>
      </div>

      {/* Display Completed Courses Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Completed Courses</h3>
        {Object.entries(completedCoursesBySemester).map(
          ([semesterName, courses]) => (
            <div key={semesterName} className="mb-6">
              <h4 className="font-medium text-lg mb-2">{semesterName}</h4>
              <div className="space-y-2">
                {courses.map((course, index) => (
                  <div
                    key={index}
                    className="p-3 bg-green-50 rounded border border-green-100"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{course.code}</span>
                        <span className="text-gray-600 ml-2">
                          {course.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                          {course.grade || "Completed"}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({course.credit} credits)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      <div className="space-y-8">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            setPlans={setPlans}
            plans={plans}
            allCourses={allCourses}
            completedCourses={completedCourses}
            onAddYear={() => addYear(plan.id)}
            onDeleteYear={(year) => deleteYear(plan.id, year)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProgramPlanner;
