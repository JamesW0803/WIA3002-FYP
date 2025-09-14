const AcademicProfile = require("../models/StudentAcademicProfile");
const AcademicSession = require("../models/AcademicSession");
const Course = require("../models/Course");
const mongoose = require("mongoose");

exports.saveAcademicProfile = async (req, res) => {
  const studentId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ message: "Invalid student ID format" });
  }

  const { entries } = req.body;

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

    // Check for existing profile to identify retakes
    const existingProfile = await AcademicProfile.findOne({
      student: studentId,
    });

    const sortedEntries = [...entries].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.semester - b.semester;
    });
    // Track per-course failures we've seen so far
    const seenFailed = new Map();

    const mappedEntries = await Promise.all(
      sortedEntries.map(async (entry) => {
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

        const priorFailed = !!seenFailed.get(entry.code);

        const result = {
          course: course._id,
          year: entry.year,
          semester: entry.semester,
          status: entry.status,
          grade: entry.grade || "",
          isRetake: priorFailed,
        };

        if (entry.status === "Failed") {
          seenFailed.set(entry.code, true);
        }

        return result;
      })
    );

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
    }

    const validEntries = mappedEntries.filter((e) => e !== null);

    let savedProfile;
    if (existingProfile) {
      existingProfile.entries = validEntries;
      savedProfile = await existingProfile.save();
    } else {
      savedProfile = await AcademicProfile.create({
        student: studentId,
        entries: validEntries,
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
      return res.status(200).json({ entries: [] }); // No profile yet
    }

    res.json(profile);
  } catch (err) {
    console.error("Error fetching academic profile:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
};
