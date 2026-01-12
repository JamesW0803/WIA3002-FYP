// studentAcademicPlanController.unit.test.js
const planController = require("../controllers/studentAcademicPlanController");
const AcademicPlan = require("../models/StudentAcademicPlan");
const Course = require("../models/Course");
const httpMocks = require("node-mocks-http");
const mongoose = require("mongoose");

// ============================================================================
// SAFETY: Ensure unit tests NEVER connect to a real database
// - If some imported module tries mongoose.connect(), fail immediately.
// ============================================================================
jest.spyOn(mongoose, "connect").mockImplementation(() => {
  throw new Error(
    "Unit tests must not call mongoose.connect(). " +
      "If you see this error, you imported a module that connects to Mongo on import."
  );
});

// ============================================================================
// Helper for mocking Mongoose query chains
// ============================================================================
const mockQuery = (result) => ({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

// ============================================================================
// Mock Models (NO REAL DB)
// ============================================================================
jest.mock("../models/StudentAcademicPlan", () => {
  const Model = jest.fn(); // constructor for `new AcademicPlan()`

  // static methods used by controller
  Model.countDocuments = jest.fn();
  Model.findOne = jest.fn();
  Model.findById = jest.fn();
  Model.findOneAndUpdate = jest.fn();
  Model.findByIdAndUpdate = jest.fn();
  Model.findOneAndDelete = jest.fn();
  Model.deleteMany = jest.fn();
  Model.updateMany = jest.fn();

  return Model;
});

jest.mock("../models/Course", () => ({
  findOne: jest.fn(),
}));

describe("Course Path Planner - Backend Unit Tests (No DB)", () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();

    // ensure jwt secret exists if auth middleware is involved elsewhere
    process.env.JWT_SECRET = process.env.JWT_SECRET || "testSecret";
    process.env.NODE_ENV = "test";
  });

  // =========================================================================
  // TC-STU-CP-04: Verify Saving the Academic Plan to Database (Create)
  // =========================================================================
  test("TC-STU-CP-04: Verify Saving the Academic Plan (Create)", async () => {
    const studentId = new mongoose.Types.ObjectId().toString();
    req.params.studentId = studentId;
    req.user = { role: "student", user_id: studentId };

    // IMPORTANT:
    // Your schema/controller expects each semester to have id + name.
    req.body = {
      name: "My New Plan",
      years: [
        {
          year: 1,
          semesters: [
            {
              id: 1,
              name: "Year 1 Semester 1",
              courses: [],
            },
          ],
        },
      ],
    };

    // planCount < 2 passes max plan rule
    AcademicPlan.countDocuments.mockResolvedValue(0);

    // mock `new AcademicPlan(...).save()`
    const saveMock = jest.fn().mockResolvedValue({
      _id: "plan_123",
      name: "My New Plan",
    });
    AcademicPlan.mockImplementation(() => ({ save: saveMock }));

    await planController.createPlan(req, res);

    expect(res.statusCode).toBe(201);
    expect(saveMock).toHaveBeenCalled();
    expect(res._getJSONData().message).toBe(
      "Academic plan created successfully"
    );
  });

  // =========================================================================
  // TC-STU-CP-01: Verify Adding a Course to a Future Semester Plan (Update Flow)
  // =========================================================================
  test("TC-STU-CP-01: Verify Adding a Course (Update Flow)", async () => {
    const planId = new mongoose.Types.ObjectId().toString();
    const studentId = new mongoose.Types.ObjectId().toString();
    req.params.planId = planId;
    req.user = { user_id: studentId };

    req.body = {
      name: "Plan A",
      years: [
        {
          year: 1,
          semesters: [
            {
              id: 1,
              name: "Year 1 Semester 1",
              courses: [{ course_code: "WIA1001" }], // controller hydrates this
            },
          ],
        },
      ],
    };

    // Mock Course.findOne().lean() → returns course ObjectId
    Course.findOne.mockReturnValue(mockQuery({ _id: "c1" }));

    // Mock AcademicPlan.findOneAndUpdate(...).populate(...)
    AcademicPlan.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: planId, name: "Plan A" }),
    });

    await planController.updatePlan(req, res);

    expect(res.statusCode).toBe(200);
    expect(AcademicPlan.findOneAndUpdate).toHaveBeenCalled();
    expect(Course.findOne).toHaveBeenCalled(); // hydration happened
  });

  // =========================================================================
  // TC-STU-CP-02: Verify Removal of a Course from the Academic Plan (Update Flow)
  // =========================================================================
  test("TC-STU-CP-02: Verify Removal of a Course (Update Flow)", async () => {
    const planId = new mongoose.Types.ObjectId().toString();
    req.params.planId = planId;
    req.user = { user_id: "student_id" };

    req.body = {
      name: "Plan A",
      years: [
        {
          year: 1,
          semesters: [
            {
              id: 1,
              name: "Year 1 Semester 1",
              courses: [], // empty => removed
            },
          ],
        },
      ],
    };

    AcademicPlan.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: planId, name: "Plan A" }),
    });

    await planController.updatePlan(req, res);

    expect(res.statusCode).toBe(200);
    expect(AcademicPlan.findOneAndUpdate).toHaveBeenCalled();
  });

  // =========================================================================
  // TC-STU-CP-03: Verify Removal of a Saved Plan (Delete)
  // =========================================================================
  test("TC-STU-CP-03: Verify Removal of a Saved Plan (Delete)", async () => {
    const planId = new mongoose.Types.ObjectId().toString();
    req.params.planId = planId;
    req.user = { user_id: "student_id" };

    AcademicPlan.findOneAndDelete.mockResolvedValue({
      _id: planId,
      isDefault: false,
    });

    await planController.deletePlan(req, res);

    expect(res.statusCode).toBe(200);
    expect(AcademicPlan.findOneAndDelete).toHaveBeenCalledWith({
      _id: planId,
      student: "student_id",
    });
  });

  // =========================================================================
  // TC-STU-CP-05: Verify Editing of a Saved Plan (Name/Notes)
  // =========================================================================
  test("TC-STU-CP-05: Verify Editing Plan Details", async () => {
    const planId = new mongoose.Types.ObjectId().toString();
    req.params.planId = planId;
    req.user = { user_id: "student_id" };

    req.body = {
      name: "Renamed Plan",
      notes: "Updated notes",
      years: [
        {
          year: 1,
          semesters: [{ id: 1, name: "Year 1 Semester 1", courses: [] }],
        },
      ],
    };

    AcademicPlan.findOneAndUpdate.mockReturnValue({
      populate: jest
        .fn()
        .mockResolvedValue({ _id: planId, name: "Renamed Plan" }),
    });

    await planController.updatePlan(req, res);

    expect(res.statusCode).toBe(200);
    expect(AcademicPlan.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: planId, student: "student_id" },
      expect.objectContaining({ name: "Renamed Plan", notes: "Updated notes" }),
      expect.objectContaining({ new: true, runValidators: true })
    );
  });

  // =========================================================================
  // TC-STU-CP-08: Verify Sending of a Saved Plan to advisor for review (Status Update)
  // =========================================================================
  test("TC-STU-CP-08: Verify Sending Plan (Status Update)", async () => {
    const planId = new mongoose.Types.ObjectId().toString();
    req.params.planId = planId;

    req.body = { status: 2 };

    AcademicPlan.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: planId, status: 2 }),
    });

    await planController.updatePlanStatus(req, res);

    expect(res.statusCode).toBe(200);
    expect(AcademicPlan.findByIdAndUpdate).toHaveBeenCalledWith(
      planId,
      expect.objectContaining({ status: 2 }),
      expect.objectContaining({ new: true, runValidators: true })
    );
    expect(res._getJSONData().message).toMatch(/status updated/i);
  });
});
