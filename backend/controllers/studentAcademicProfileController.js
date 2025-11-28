const AcademicProfile = require("../models/StudentAcademicProfile");
const AcademicSession = require("../models/AcademicSession");
const Course = require("../models/Course");
const mongoose = require("mongoose");
const {
  updateStudentProgressStatus,
} = require("../controllers/studentController");

const Student = require("../models/Student");
const ProgrammeIntake = require("../models/ProgrammeIntake");

exports.saveAcademicProfile = async (req, res) => {
  const studentId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ message: "Invalid student ID format" });
  }

  const { entries, gaps = [] } = req.body;

  try {
    const currentSession = await AcademicSession.findOne({ isCurrent: true });
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

    const student = await Student.findById(studentId).populate("programme");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
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
      // Fetch course with populated prerequisites so we can see course_code
      const course = await Course.findOne({ course_code: entry.code })
        .populate("prerequisites", "course_code")
        .populate("prerequisitesByProgramme.prerequisites", "course_code");

      if (!course) continue;

      // -------- programme-aware prerequisites --------
      let applicablePrereqs = [];

      if (student?.programme) {
        // find matching programme-specific config
        const cfg = (course.prerequisitesByProgramme || []).find(
          (p) =>
            p.programme &&
            p.programme.toString() === student.programme._id.toString()
        );

        if (cfg) {
          applicablePrereqs = cfg.prerequisites || [];
        } else {
          // fallback to global prerequisites
          applicablePrereqs = course.prerequisites || [];
        }
      } else {
        // no programme on student → fallback to global
        applicablePrereqs = course.prerequisites || [];
      }

      // -------- "no same semester as prereqs" rule --------
      if (applicablePrereqs.length > 0) {
        const prereqCodes = applicablePrereqs.map((p) => p.course_code);

        const sameSemesterPrereqs = entries.some(
          (e) =>
            e.year === entry.year &&
            e.semester === entry.semester &&
            prereqCodes.includes(e.code)
        );

        if (sameSemesterPrereqs) {
          return res.status(400).json({
            message: `Course ${entry.code} cannot be taken in the same semester as its prerequisites`,
          });
        }
      }

      // -------- credit hours --------
      if (entry.status === "Passed") {
        completed_credits += course.credit_hours || 0;
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

    await updateStudentProgressStatus(studentId, savedProfile);

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

  try {
    // 1) Academic profile (courses, gaps, etc.)
    const profile = await AcademicProfile.findOne({
      student: studentId,
    }).populate("entries.course");

    // 2) Student, with possible programme_intake
    const studentDoc = await Student.findById(studentId)
      .populate("programme")
      .populate("academicSession")
      .populate("programme_intake");

    // If no profile yet, still return intake info so planner can work
    if (!profile) {
      let programme_intake_code = null;
      let intakeDoc = null;

      if (studentDoc?.programme_intake) {
        intakeDoc = studentDoc.programme_intake;
        programme_intake_code = intakeDoc.programme_intake_code;
      } else if (studentDoc?.programme && studentDoc?.academicSession) {
        // Fallback: find by programme + academic session
        intakeDoc = await ProgrammeIntake.findOne({
          programme_id: studentDoc.programme._id || studentDoc.programme,
          academic_session_id:
            studentDoc.academicSession._id || studentDoc.academicSession,
        });
        programme_intake_code = intakeDoc?.programme_intake_code || null;
      }

      return res.status(200).json({
        entries: [],
        gaps: [],
        completed_credit_hours: 0,
        student: studentId,
        programme_intake_code,
        programmeIntake: intakeDoc || undefined,
      });
    }

    // --- existing credit-hour recompute logic ---
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

    // 3) Resolve intake, same way as for the no-profile case
    let programme_intake_code = null;
    let intakeDoc = null;

    if (studentDoc?.programme_intake) {
      intakeDoc = studentDoc.programme_intake;
      programme_intake_code = intakeDoc.programme_intake_code;
    } else if (studentDoc?.programme && studentDoc?.academicSession) {
      intakeDoc = await ProgrammeIntake.findOne({
        programme_id: studentDoc.programme._id || studentDoc.programme,
        academic_session_id:
          studentDoc.academicSession._id || studentDoc.academicSession,
      });
      programme_intake_code = intakeDoc?.programme_intake_code || null;
    }

    // 4) Attach to response
    const payload = {
      ...json,
      student: studentDoc,
      programme_intake_code,
      programmeIntake: intakeDoc || undefined,
    };

    console.log("[API] getAcademicProfile payload student:", {
      id: studentDoc?._id,
      department: studentDoc?.department,
      programme: {
        id: studentDoc?.programme?._id,
        code: studentDoc?.programme?.programme_code,
        department: studentDoc?.programme?.department,
      },
    });

    res.json(payload);
  } catch (err) {
    console.error("Error fetching academic profile:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStudentIntakeInfo = async (req, res) => {
  const studentId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ message: "Invalid student ID format" });
  }

  try {
    const student = await Student.findById(studentId)
      .populate("programme_intake")
      .populate("academicSession");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let intakeYear = null;
    let intakeSemester = null;

    // 1) Prefer programme_intake → its academic_session_id
    if (student.programme_intake) {
      const intake = await ProgrammeIntake.findById(
        student.programme_intake._id || student.programme_intake
      ).populate("academic_session_id");

      if (intake && intake.academic_session_id) {
        intakeYear = intake.academic_session_id.year;
        intakeSemester = intake.academic_session_id.semester;
      }
    } else {
      console.log(
        "[getStudentIntakeInfo] Student has NO programme_intake; will fallback to academicSession."
      );
    }

    // 2) Fallback to student's academicSession
    if (!intakeYear && student.academicSession) {
      const session = await AcademicSession.findById(
        student.academicSession._id || student.academicSession
      );
      if (session) {
        intakeYear = session.year;
        intakeSemester = session.semester;
      }
    } else if (!intakeYear) {
      console.log(
        "[getStudentIntakeInfo] Student has NO academicSession on doc either."
      );
    }

    if (!intakeYear || !intakeSemester) {
      return res
        .status(404)
        .json({ message: "Intake info not found for this student" });
    }

    return res.json({
      intakeYear,
      intakeSemester,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
