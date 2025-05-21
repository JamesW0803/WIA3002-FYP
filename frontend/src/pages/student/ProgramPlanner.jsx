import React, { useState } from "react";
import PlanCard from "../../components/Students/PlanCard";
import { Button } from "../../components/ui/button";
import { COURSES_DATABASE } from "../../constants/courses";

const ProgramPlanner = () => {
  const [plans, setPlans] = useState([
    {
      id: 1,
      name: "Plan A",
      years: [
        {
          year: 1,
          semesters: [
            {
              id: 1,
              name: "Year 1 - Semester 1",
              courses: [
                COURSES_DATABASE.find((c) => c.code === "WIX1001"),
                COURSES_DATABASE.find((c) => c.code === "WIX1002"),
              ],
              completed: false,
            },
            {
              id: 2,
              name: "Year 1 - Semester 2",
              courses: [COURSES_DATABASE.find((c) => c.code === "WIA1002")],
              completed: false,
            },
          ],
        },
      ],
    },
  ]);

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Program Planner</h2>
        <Button onClick={addPlan}>Add Program Plan</Button>
      </div>

      <div className="space-y-8">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            setPlans={setPlans}
            plans={plans}
            allCourses={COURSES_DATABASE}
            onAddYear={() => addYear(plan.id)}
            onDeleteYear={(year) => deleteYear(plan.id, year)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProgramPlanner;
