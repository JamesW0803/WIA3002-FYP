const AcademicProfile = require("../models/StudentAcademicProfile");
const AcademicSession = require("../models/AcademicSession");
const Course = require("../models/Course");
const mongoose = require("mongoose");

exports.saveAcademicProfile = async (req, res) => {
  const studentId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ message: "Invalid student ID format" });
  }

  const { entries, gaps = [] } = req.body;

  try {
    const currentSession = await AcademicSession.findOne({ isCurrent: true });
    console.log(
      currentSession && {
        year: currentSession.year,
        semester: currentSession.semester,
      }
    );
    if (!currentSession) {
      return res
        .status(400)
        .json({ message: "Current academic session not found" });
    }

    // Check for future semesters
    for (const entry of entries) {
      if (
        entry.year > currentSession.year ||
        (entry.year === currentSession.year &&
          entry.semester > currentSession.semester)
      ) {
        return res.status(400).json({
          message: `Cannot add courses for future semesters (Year ${entry.year} Semester ${entry.semester})`,
        });
      }
    }

    const yearGaps = new Set(
      gaps
        .filter(
          (g) =>
            g && g.year && (g.semester === null || g.semester === undefined)
        )
        .map((g) => Number(g.year))
    );
    const normalizedGaps = [];
    const seenKey = new Set();
    for (const g of gaps) {
      if (!g || !g.year) continue;
      const yr = Number(g.year);
      const sem =
        g.semester === null || g.semester === undefined
          ? null
          : Number(g.semester);
      if (yearGaps.has(yr) && sem !== null) continue; // suppressed by year-level gap
      const key = `${yr}:${sem === null ? "Y" : sem}`;
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      normalizedGaps.push({ year: yr, semester: sem });
    }

    // Check for existing profile to identify retakes
    const existingProfile = await AcademicProfile.findOne({
      student: studentId,
    });

    const sortedEntries = [...entries].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.semester - b.semester;
    });

    // ---- 1) Sync pass: enforce A/A+ rule & mark retakes ----
    const attemptsByCourse = new Map();
    const annotatedEntries = sortedEntries.map((entry) => {
      const history = attemptsByCourse.get(entry.code) || [];

      // have we already seen a prior A/A+ for this course?
      const hasAorAplus = history.some(
        (h) => h.status === "Passed" && (h.grade === "A" || h.grade === "A+")
      );
      if (hasAorAplus) {
        // same message your catch block is looking for
        throw new Error(
          `Cannot record ${entry.code} again after achieving A/A+.`
        );
      }

      // any prior attempt => this one is a retake
      const isRetake = history.length > 0;

      // record current attempt for later checks
      history.push({ status: entry.status, grade: entry.grade });
      attemptsByCourse.set(entry.code, history);

      return { ...entry, isRetake };
    });

    // ---- 2) Async pass: map to DB documents (no shared mutable state) ----
    const mappedEntries = await Promise.all(
      annotatedEntries.map(async (entry) => {
        const course = await Course.findOne({ course_code: entry.code });
        if (!course) return null;

        if (
          Array.isArray(course.offered_semester) &&
          course.offered_semester.length > 0
        ) {
          const norm = course.offered_semester.map((s) =>
            String(s).toLowerCase()
          );
          const ok =
            norm.includes(`semester ${entry.semester}`) ||
            norm.includes("both") ||
            norm.includes("all") ||
            norm.includes("any");
          if (!ok) {
            throw new Error(
              `Course ${entry.code} is not offered in Semester ${entry.semester}`
            );
          }
        }

        return {
          course: course._id,
          year: entry.year,
          semester: entry.semester,
          status: entry.status,
          grade: entry.grade || "",
          isRetake: entry.isRetake, // use the annotated flag
        };
      })
    );

    let completed_credits = 0;
    for (const entry of entries) {
      const course = await Course.findOne({ course_code: entry.code });
      if (course?.prerequisites?.length > 0) {
        const sameSemesterPrereqs = await Course.find({
          course_code: { $in: course.prerequisites.map((p) => p.course_code) },
        }).then((prereqs) => {
          return entries.some(
            (e) =>
              prereqs.some((p) => p.course_code === e.code) &&
              e.year === entry.year &&
              e.semester === entry.semester
          );
        });

        if (sameSemesterPrereqs) {
          return res.status(400).json({
            message: `Course ${entry.code} cannot be taken in the same semester as its prerequisites`,
          });
        }
      }
      if (entry.status === "Passed" && course) {
        completed_credits += course.credit_hours;
      }
    }

    const validEntries = mappedEntries.filter((e) => e !== null);

    let savedProfile;
    if (existingProfile) {
      existingProfile.entries = validEntries;
      existingProfile.gaps = normalizedGaps;
      existingProfile.completed_credit_hours = completed_credits;
      savedProfile = await existingProfile.save();
    } else {
      savedProfile = await AcademicProfile.create({
        student: studentId,
        entries: validEntries,
        gaps: normalizedGaps,
        completed_credit_hours: completed_credits,
      });
    }

    res.json({
      message: "Academic profile saved successfully",
      profile: savedProfile,
    });
  } catch (err) {
    console.error("Error saving academic profile:", err);
    if (String(err?.message || "").includes("not offered in Semester")) {
      return res.status(400).json({ message: err.message });
    }
    if (
      String(err?.message || "").includes("Cannot record") &&
      String(err?.message || "").includes("A/A+")
    ) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAcademicProfile = async (req, res) => {
  const studentId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ message: "Invalid student ID format" });
  }

  try {
    const profile = await AcademicProfile.findOne({
      student: studentId,
    }).populate("entries.course");

    if (!profile) {
      return res.status(200).json({ entries: [], gaps: [] });
    }

    let totalCompletedCredits = 0;
    if (
      !profile.completed_credit_hours ||
      profile.completed_credit_hours === 0
    ) {
      totalCompletedCredits = profile.entries.reduce((sum, courseObj) => {
        if (courseObj.status === "Passed" && courseObj.course) {
          return sum + (courseObj.course.credit_hours || 0);
        }
        return sum;
      }, 0);
      profile.completed_credit_hours = totalCompletedCredits;
    }
    const json = profile.toObject ? profile.toObject() : profile;
    if (!json.gaps) json.gaps = [];
    res.json(json);
  } catch (err) {
    console.error("Error fetching academic profile:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
};
