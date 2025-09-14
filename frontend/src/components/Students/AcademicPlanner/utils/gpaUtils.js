export const gradePointsMap = {
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

export const orderedGrades = [
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "F",
];

// nearest grade that meets or exceeds required points
export function gradeForPoints(p) {
  for (const g of orderedGrades) {
    if (gradePointsMap[g] >= p) return g;
  }
  return "F";
}

export function safeNum(n, fallback = 0) {
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : fallback;
}

export function computeTermAndCumulative(entries) {
  // entries: [{year, semester, course: {credit_hours}, grade, status}]
  // returns { terms: [{label, credits, gpa}], cgpa, totalCredits, totalPoints }
  const key = (e) => `Y${e.year}-S${e.semester}`;
  const buckets = new Map();
  for (const e of entries) {
    if (!buckets.has(key(e))) {
      buckets.set(key(e), {
        label: `Year ${e.year} • Sem ${e.semester}`,
        credits: 0,
        points: 0,
        rows: [],
      });
    }
    buckets.get(key(e)).rows.push(e);
  }

  const terms = [];
  let totalCredits = 0;
  let totalPoints = 0;

  for (const [, bucket] of Array.from(buckets.entries()).sort()) {
    let termCredits = 0;
    let termPoints = 0;
    for (const r of bucket.rows) {
      const cr = safeNum(r.course?.credit_hours);
      const gp = gradePointsMap[r.grade] ?? null;
      if (gp !== null && (r.status === "Passed" || r.status === "Failed")) {
        termCredits += cr;
        termPoints += cr * gp;
        if (r.status === "Passed") {
          // If your policy includes F in CGPA, move this outside the if
          totalCredits += cr;
          totalPoints += cr * gp;
        }
      }
    }
    terms.push({
      label: bucket.label,
      credits: termCredits,
      gpa: termCredits > 0 ? termPoints / termCredits : 0,
    });
  }

  const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
  return { terms, cgpa, totalCredits, totalPoints };
}

export function requiredTermGPAForTarget(
  currentGPA,
  completedCredits,
  targetCGPA,
  upcomingCredits
) {
  const currPts = safeNum(currentGPA) * safeNum(completedCredits);
  const totalCreds = safeNum(completedCredits) + safeNum(upcomingCredits);
  if (upcomingCredits <= 0 || totalCreds <= 0) return null;
  const reqPts = safeNum(targetCGPA) * totalCreds - currPts;
  return reqPts / safeNum(upcomingCredits);
}

// Distribute evenly by credit (legacy single-term)
export function suggestPerCourseGrades(courses, requiredTermGPA) {
  if (!courses?.length) return [];
  const totalCredits = courses.reduce(
    (s, c) => s + safeNum(c.credit || c.credit_hours),
    0
  );
  if (totalCredits <= 0)
    return courses.map((c) => ({
      code: c.code,
      name: c.name,
      credit: c.credit || c.credit_hours,
      target: "—",
    }));

  const perCreditNeeded = requiredTermGPA;
  return courses.map((c) => {
    const cr = safeNum(c.credit || c.credit_hours);
    const minGrade = gradeForPoints(perCreditNeeded);
    return { code: c.code, name: c.name, credit: cr, target: minGrade };
  });
}

// Simulate retake: add new Passed attempt (typical policy)
export function simulateRetake(
  currentPoints,
  completedCredits,
  failedCourseCredit,
  newGrade
) {
  const newGp = gradePointsMap[newGrade] ?? 0;
  const newPoints = currentPoints + failedCourseCredit * newGp;
  const newCredits = completedCredits + failedCourseCredit;
  return { newCGPA: newCredits > 0 ? newPoints / newCredits : 0 };
}

// Multi-term requirement (single average across all selected upcoming terms)
export function requiredMultiTermGPAForTarget(
  currentGPA,
  completedCredits,
  targetCGPA,
  upcomingTermsCredits = [] // e.g. [18, 17]
) {
  const sumUpcoming = upcomingTermsCredits.reduce((s, x) => s + safeNum(x), 0);
  if (sumUpcoming <= 0) return null;
  return requiredTermGPAForTarget(
    currentGPA,
    completedCredits,
    targetCGPA,
    sumUpcoming
  ); // same math, just pooled credits
}

// Weighted per-course targets: let tougher courses aim a bit higher.
// weightsMap: key => weight (>=0). key can be any string you pass (e.g., `${termIdx}|${code}|${idx}`)
// biasStrength: 0..0.5 (how strongly to bias around the required average)
export function suggestPerCourseGradesWeighted(
  courses,
  requiredAvgGPA,
  weightsMap = {},
  biasStrength = 0.2
) {
  if (!courses?.length) return [];

  const rows = courses.map((c, i) => {
    const cr = safeNum(c.credit || c.credit_hours);
    // Key priority: allow collisions gracefully
    const key = c._key || c.key || `${i}|${c.code || c.name || "UNK"}`;
    const w = safeNum(weightsMap[key], 1);
    return { ...c, _cr: cr, _w: w, _k: key };
  });

  const totalCr = rows.reduce((s, r) => s + r._cr, 0);
  if (totalCr <= 0)
    return rows.map((r) => ({
      code: r.code,
      name: r.name,
      credit: r._cr,
      target: "—",
    }));

  // Credit-weighted mean of weights (ensures sum(cr * delta) = 0)
  const meanW = rows.reduce((s, r) => s + r._cr * r._w, 0) / (totalCr || 1);

  // Bias around the required average (keep small to avoid clamping)
  const k = Math.max(0, Math.min(0.5, biasStrength)); // cap 0..0.5

  return rows.map((r) => {
    let gp = requiredAvgGPA + k * (r._w - meanW);
    gp = Math.max(0, Math.min(4.0, gp)); // clamp
    const minGrade = gradeForPoints(gp);
    return {
      code: r.code,
      name: r.name,
      credit: r._cr,
      target: minGrade,
      _gp: gp,
    };
  });
}

// Simple threshold checks for banners
export function checkThresholds({
  termGPARequired, // required GPA for upcoming term(s)
  termCreditsPlanned, // credits in first upcoming term
  cgpaNow, // current CGPA
  lastTermGPA, // from transcript (optional)
  thresholds = { deansListGPA: 3.7, deansMinCredits: 15, probationGPA: 2.0 },
}) {
  const notes = [];
  // Dean's List eligibility by credits
  if (termCreditsPlanned < thresholds.deansMinCredits) {
    notes.push({
      level: "warn",
      text: `Dean’s List requires ≥ ${thresholds.deansMinCredits} credits; you currently planned ${termCreditsPlanned}.`,
    });
  }
  // Dean's List feasibility by requirement
  if (termGPARequired != null && termGPARequired < thresholds.deansListGPA) {
    notes.push({
      level: "info",
      text: `Dean’s List target (${thresholds.deansListGPA.toFixed(
        2
      )}) is above your required average (${termGPARequired.toFixed(
        2
      )}). Aim higher if you want Dean’s List.`,
    });
  }
  if (termGPARequired != null && termGPARequired > 4.0) {
    notes.push({
      level: "error",
      text: `Required term average ${termGPARequired.toFixed(
        2
      )} exceeds 4.00 — mathematically impossible. Adjust credits/target or add more terms.`,
    });
  }
  // Trend risk (optional: compare last term to Dean’s List)
  if (lastTermGPA != null && lastTermGPA < thresholds.deansListGPA) {
    notes.push({
      level: "warn",
      text: `Last term GPA (${lastTermGPA.toFixed(
        2
      )}) was below Dean’s List (${thresholds.deansListGPA.toFixed(2)}).`,
    });
  }
  // Probation nudge
  if (cgpaNow < thresholds.probationGPA) {
    notes.push({
      level: "error",
      text: `CGPA (${cgpaNow.toFixed(
        2
      )}) is below the probation threshold (${thresholds.probationGPA.toFixed(
        2
      )}). Consult your advisor about course load and a recovery plan.`,
    });
  }
  return notes;
}
