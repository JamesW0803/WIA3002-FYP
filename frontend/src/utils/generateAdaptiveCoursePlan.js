/**
 * options:
 *   completedEntries: Array<{ course_code, status: "Passed"|"Failed", semester: { year, sem } }>
 *   allCourses:      Array<{ course_code, credit_hours, prerequisites: [codes], offered_semester: ["Semester 1", ...], type, course_name }>
 *   gapSemesters:    Array<{ year: number, sem: number }>
 *   outboundSemesters:Array<{ year: number, sem: number }>
 *   startPoint:      { year: number, sem: number }
 *   strategy:        "balanced" | "light"
 */
export default function generateAdaptiveCoursePlan({
  completedEntries,
  allCourses,
  gapSemesters = [],
  outboundSemesters = [],
  startPoint = { year: 1, sem: 1 },
  strategy = "balanced",
}) {
  const MAX = strategy === "balanced" ? 22 : 20;

  // 1) split passed vs failed
  const passed = new Set(
    completedEntries
      .filter((e) => e.status === "Passed")
      .map((e) => e.course_code)
  );
  const failed = new Set(
    completedEntries
      .filter((e) => e.status === "Failed")
      .map((e) => e.course_code)
  );

  // 2) build course map, succ list & in-degree for topo
  const courseMap = new Map();
  allCourses.forEach((c) => courseMap.set(c.course_code, c));

  const succ = {}; // adjacency list: code -> [dependents...]
  const inDegTopo = {}; // for topo sort
  allCourses.forEach((c) => {
    inDegTopo[c.course_code] = 0;
    succ[c.course_code] = [];
  });
  allCourses.forEach((c) => {
    c.prerequisites.forEach((pre) => {
      if (succ[pre]) {
        succ[pre].push(c.course_code);
        inDegTopo[c.course_code]++;
      }
    });
  });

  // 3) topological order and compute heights (longest path to a sink)
  const topo = [];
  const q = [];
  for (const [code, deg] of Object.entries(inDegTopo)) {
    if (deg === 0) q.push(code);
  }
  while (q.length) {
    const u = q.shift();
    topo.push(u);
    for (const v of succ[u]) {
      inDegTopo[v]--;
      if (inDegTopo[v] === 0) q.push(v);
    }
  }

  const height = {};
  topo.forEach((c) => (height[c] = 0));
  topo.reverse().forEach((u) => {
    for (const v of succ[u]) {
      height[u] = Math.max(height[u], 1 + height[v]);
    }
  });

  // 4) Prepare scheduling state
  const unscheduled = new Set(
    allCourses.map((c) => c.course_code).filter((c) => !passed.has(c))
  );

  const inDegSched = {};
  unscheduled.forEach((code) => {
    const course = courseMap.get(code);
    inDegSched[code] = course.prerequisites.filter(
      (p) => !passed.has(p)
    ).length;
  });

  function markDone(code) {
    if (!unscheduled.has(code)) return;
    unscheduled.delete(code);
    passed.add(code);
    for (const v of succ[code]) {
      if (v in inDegSched) {
        inDegSched[v] = (inDegSched[v] || 0) - 1;
      }
    }
  }

  // 5) list-schedule from startPoint forward
  const plan = [];
  let { year, sem } = startPoint;
  let noProgress = 0; // <— stall detection counter

  while (unscheduled.size) {
    const slot = { year, sem, courses: [] };

    // 5A) gap semester?
    if (gapSemesters.some((g) => g.year === year && g.sem === sem)) {
      slot.note = "Gap semester";

      // 5B) outbound?
    } else if (
      outboundSemesters.some((g) => g.year === year && g.sem === sem)
    ) {
      slot.note = "Outbound";
      const allowed = Array.from(unscheduled).filter((code) => {
        const c = courseMap.get(code);
        return (
          ["university_other", "university_cocurriculum"].includes(c.type) &&
          c.offered_semester.includes(`Semester ${sem}`) &&
          inDegSched[code] === 0
        );
      });
      allowed.sort((a, b) => height[b] - height[a]);
      allowed.slice(0, 3).forEach((code) => {
        slot.courses.push(courseMap.get(code));
        markDone(code);
      });

      // 5C) normal term
    } else {
      let credits = 0;
      const ready = Array.from(unscheduled).filter(
        (code) =>
          inDegSched[code] === 0 &&
          courseMap.get(code).offered_semester.includes(`Semester ${sem}`)
      );

      const retakes = ready.filter((c) => failed.has(c));
      const news = ready.filter((c) => !failed.has(c));

      retakes.sort((a, b) => height[b] - height[a]);
      news.sort((a, b) => height[b] - height[a]);

      for (const code of retakes) {
        if (passed.has(code)) continue; // prevent re-adding passed courses
        const c = courseMap.get(code);
        if (credits + c.credit_hours <= MAX) {
          slot.courses.push(c);
          credits += c.credit_hours;
          markDone(code);
        }
      }

      for (const code of news) {
        if (credits >= MAX) break;
        if (passed.has(code)) continue; // prevent re-adding passed courses
        const c = courseMap.get(code);
        if (credits + c.credit_hours <= MAX) {
          slot.courses.push(c);
          credits += c.credit_hours;
          markDone(code);
        }
      }
    }

    // ───── Stall detection ─────
    const isGap = slot.note === "Gap semester";
    const isOutbound = slot.note === "Outbound";
    if (!isGap && !isOutbound && slot.courses.length === 0) {
      noProgress++;
    } else {
      noProgress = 0;
    }

    // If we stall 4 terms in a row, force‐schedule all left
    if (noProgress >= 4) {
      const rest = Array.from(unscheduled).map((code) => courseMap.get(code));
      plan.push({
        year,
        sem,
        note: "Forced completion",
        courses: rest,
      });
      break;
    }
    // ────────────────────────────

    plan.push(slot);

    // advance term
    sem++;
    if (sem > 2) {
      sem = 1;
      year++;
    }
  }

  return plan;
}
