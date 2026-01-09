const planController = require("../controllers/studentAcademicPlanController");
const AcademicPlan = require("../models/StudentAcademicPlan");
const Course = require("../models/Course");
const httpMocks = require("node-mocks-http");
const mongoose = require("mongoose");

const mockLeanQuery = (result) => ({
  lean: jest.fn().mockResolvedValue(result),
});

// ✅ Mock Models
jest.mock("../models/StudentAcademicPlan", () => {
  const Model = jest.fn();
  Model.countDocuments = jest.fn();
  Model.findOneAndUpdate = jest.fn();
  Model.find = jest.fn();
  Model.findOne = jest.fn();
  Model.findById = jest.fn();
  Model.findByIdAndUpdate = jest.fn();
  Model.findOneAndDelete = jest.fn();
  Model.deleteMany = jest.fn();
  Model.updateMany = jest.fn();
  return Model;
});

jest.mock("../models/Course");

describe("Course Path Planner - Backend Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  test("TC-STU-CP-06: Verify Saving the Academic Plan to Database", async () => {
    const studentId = new mongoose.Types.ObjectId().toString();
    req.params.studentId = studentId;
    req.user = { role: "student", user_id: studentId };

    req.body = {
      name: "My Draft Plan",
      years: [
        {
          year: 1,
          semesters: [{ semester: 1, courses: [{ course_code: "WIA1001" }] }],
        },
      ],
    };

    AcademicPlan.countDocuments.mockResolvedValue(0);

    Course.findOne.mockImplementation((query) => {
      if (query.course_code === "WIA1001")
        return mockLeanQuery({ _id: "course_id_1" });
      return mockLeanQuery(null);
    });

    const saveMock = jest
      .fn()
      .mockResolvedValue({ _id: "plan_id_1", name: "My Draft Plan" });

    AcademicPlan.mockImplementation(() => ({ save: saveMock }));

    await planController.createPlan(req, res);

    expect(res.statusCode).toBe(201);
    expect(saveMock).toHaveBeenCalled();
    expect(res._getJSONData()).toEqual(
      expect.objectContaining({ message: "Academic plan created successfully" })
    );
  });

  test("TC-STU-CP-01/03: Verify Updating Plan (Adding/Removing Courses)", async () => {
    const planId = new mongoose.Types.ObjectId().toString();
    const studentId = new mongoose.Types.ObjectId().toString();

    req.params.planId = planId;
    req.user = { user_id: studentId };

    req.body = {
      name: "Updated Plan",
      years: [
        {
          year: 1,
          semesters: [
            {
              semester: 1,
              courses: [
                { course_code: "WIA1001" },
                { course_code: "NEW_COURSE" },
              ],
            },
          ],
        },
      ],
    };

    Course.findOne.mockImplementation((query) => {
      if (query.course_code === "WIA1001") return mockLeanQuery({ _id: "c1" });
      if (query.course_code === "NEW_COURSE")
        return mockLeanQuery({ _id: "c2" });
      return mockLeanQuery(null);
    });

    AcademicPlan.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: planId,
        name: "Updated Plan",
        years: [{ semesters: [{ courses: [{}, {}] }] }],
      }),
    });

    await planController.updatePlan(req, res);

    expect(res.statusCode).toBe(200);
    expect(AcademicPlan.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: planId }),
      expect.objectContaining({ name: "Updated Plan" }),
      expect.anything()
    );
  });
});
