// 1. Import dependencies and the controller
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const Student = require("../models/Student");
const bcrypt = require("bcrypt");
const sendEmail = require("../utils/sendEmail");
const httpMocks = require("node-mocks-http"); // Helper to create fake req/res objects
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// 2. Mock external libraries so we don't touch the real DB or Email
jest.mock("../models/User");
jest.mock("../models/Student", () => jest.fn());
jest.mock("../models/Admin", () => jest.fn());
jest.mock("../models/ProgrammeIntake", () => ({
  findOne: jest.fn(),
}));
jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("../utils/sendEmail");
jest.mock("../utils/generateToken", () => jest.fn(() => "mocked_jwt_token"));

describe("Authentication & Authorization Module Unit Tests", () => {
  let req, res, next;

  // Reset mocks before each test to ensure clean state
  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();

    // Mock Mongoose Session (Required for Register function)
    const mockSession = {
      withTransaction: jest.fn((callback) => callback()),
      endSession: jest.fn(),
    };
    mongoose.startSession = jest.fn().mockResolvedValue(mockSession);
  });

  // =========================================================================
  // TC-AUTH-01: Verify Student Sign-Up with Valid Credentials
  // =========================================================================
  test("TC-AUTH-01: Verify Student Sign-Up with Valid Credentials", async () => {
    req.body = {
      name: "Ali Bin Abu",
      email: "ali@siswa.um.edu.my",
      password: "Password123!",
      role: "student",
      contact: "0123456789",
      faculty: "FCSIT",
      department: "SE",
      programme: "mock_prog_id",
      academicSession: "mock_session_id",
      semester: "1",
    };

    // User.findOne is used 3 times in register()
    User.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });

    // ProgrammeIntake.findOne(...).session(session)
    const ProgrammeIntake = require("../models/ProgrammeIntake");
    ProgrammeIntake.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null), // intake not found -> ok
    });

    bcrypt.hash.mockResolvedValue("hashed_password_123");

    const saveMock = jest.fn().mockResolvedValue(true);

    // Student is a constructor (new Student()), so it must be a function mock
    Student.mockImplementation(() => ({
      save: saveMock,
    }));

    await authController.register(req, res);

    expect(res.statusCode).toBe(201);
    expect(res._getJSONData()).toEqual({ message: "Registration successful" });
    expect(saveMock).toHaveBeenCalled();
  });

  // =========================================================================
  // TC-AUTH-03: Verify Login with Valid Student Credentials
  // =========================================================================
  test("TC-AUTH-03: Verify Login with Valid Student Credentials", async () => {
    // 1. Input Data
    req.body = {
      identifier: "ali@siswa.um.edu.my",
      password: "Password123!",
      role: "student",
    };

    // 2. Mock DB: User found
    const mockUser = {
      _id: "user_id_123",
      username: "Ali",
      email: "ali@siswa.um.edu.my",
      password: "hashed_password",
      role: "student",
      access_level: null,
    };
    User.findOne.mockResolvedValue(mockUser);

    // Mock Password Match
    bcrypt.compare.mockResolvedValue(true);

    // 3. Execution
    await authController.login(req, res);

    // 4. Verification
    expect(res.statusCode).toBe(200);
    const responseData = res._getJSONData();
    expect(responseData.token).toBe("mocked_jwt_token");
    expect(responseData.user.username).toBe("Ali");
  });

  // =========================================================================
  // TC-AUTH-05: Verify System Rejects Login with Invalid Password
  // =========================================================================
  test("TC-AUTH-05: Verify System Rejects Login with Invalid Password", async () => {
    // 1. Input Data
    req.body = {
      identifier: "ali@siswa.um.edu.my",
      password: "WrongPassword!",
      role: "student",
    };

    // 2. Mock DB: User found
    User.findOne.mockResolvedValue({
      email: "ali@siswa.um.edu.my",
      password: "hashed_password",
      role: "student",
    });

    // Mock Password Mismatch
    bcrypt.compare.mockResolvedValue(false);

    // 3. Execution
    await authController.login(req, res);

    // 4. Verification
    expect(res.statusCode).toBe(401);
    expect(res._getJSONData()).toEqual({ message: "Invalid credentials" });
  });

  // =========================================================================
  // TC-AUTH-06: Verify "Forgot Password" Link Generation and Email Delivery
  // =========================================================================
  test("TC-AUTH-06: Verify 'Forgot Password' Link Generation and Email Delivery", async () => {
    // 1. Input Data
    req.body = { email: "ali@siswa.um.edu.my" };

    // 2. Mock DB
    User.findOne.mockResolvedValue({
      _id: "user_id_123",
      email: "ali@siswa.um.edu.my",
    });

    // Mock JWT creation for reset token
    jwt.sign.mockReturnValue("reset_token_123");

    // 3. Execution
    await authController.requestPasswordReset(req, res);

    // 4. Verification
    expect(sendEmail).toHaveBeenCalledWith(
      "ali@siswa.um.edu.my",
      expect.objectContaining({
        subject: "Password Reset",
      })
    );
    expect(res.statusCode).toBe(200);
  });

  // =========================================================================
  // TC-AUTH-07: Verify Password Reset Functionality with Token
  // =========================================================================
  test("TC-AUTH-07: Verify Password Reset Functionality with Token", async () => {
    // 1. Input Data
    req.body = {
      token: "valid_reset_token",
      password: "NewStrongPassword123!",
    };

    // 2. Mock JWT Verify
    jwt.verify.mockReturnValue({
      id: "user_id_123",
      purpose: "password_reset",
    });

    // Mock User Retrieval and Save
    const saveMock = jest.fn();
    User.findById.mockResolvedValue({
      _id: "user_id_123",
      password: "old_password",
      save: saveMock,
    });

    // 3. Execution
    await authController.resetPassword(req, res);

    // 4. Verification
    expect(bcrypt.hash).toHaveBeenCalled(); // Should hash new password
    expect(saveMock).toHaveBeenCalled(); // Should save user
    expect(res.statusCode).toBe(200);
  });

  // =========================================================================
  // TC-AUTH-08: Verify Unauthorized Access Prevention (Session Validation)
  // =========================================================================
  test("TC-AUTH-08: Verify Unauthorized Access Prevention for Protected Routes", async () => {
    // 1. Input Data: Request WITHOUT 'Authorization' header
    req.headers = {};

    // 2. Execution (Testing Middleware directly)
    authMiddleware.authenticate(req, res, next);

    // 3. Verification
    expect(res.statusCode).toBe(401);
    expect(res._getJSONData()).toEqual({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled(); // Ensure it didn't proceed to controller
  });
});
