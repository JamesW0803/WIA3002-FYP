const AcademicProfile = require("../models/StudentAcademicProfile");
const Course = require("../models/Course");
const mongoose = require("mongoose");

exports.saveAcademicProfile = async (req, res) => {
  const studentId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ message: "Invalid student ID format" });
  }

  const { entries } = req.body;

  try {
    // Check for existing profile to identify retakes
    const existingProfile = await AcademicProfile.findOne({
      student: studentId,
    });
    const previousEntries = existingProfile ? existingProfile.entries : [];

    const mappedEntries = await Promise.all(
      entries.map(async (entry) => {
        const course = await Course.findOne({ course_code: entry.code });
        if (!course) return null;

        // Check if this course was previously failed
        const previouslyFailed = previousEntries.some(
          (prev) =>
            prev.course.toString() === course._id.toString() &&
            prev.status === "Failed"
        );

        return {
          course: course._id,
          year: entry.year,
          semester: entry.semester,
          status: entry.status,
          grade: entry.grade || "",
          isRetake: previouslyFailed,
        };
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
