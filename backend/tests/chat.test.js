jest.mock("../models/Message");
jest.mock("../models/Conversation");

// prevent azure init from killing jest
jest.mock("../lib/azure", () => ({
  ensureContainer: jest.fn().mockResolvedValue(undefined),
  getWriteSAS: jest.fn().mockResolvedValue({
    uploadUrl: "https://fake-upload-url",
    blobUrl: "https://fake-blob-url",
    expiresOn: new Date().toISOString(),
  }),
  UPLOADS_CONTAINER: "uploads",
}));

// mock socket getter used by controller
const mockIoEmit = jest.fn();
const mockIoTo = jest.fn(() => ({ emit: mockIoEmit }));
jest.mock("../socket", () => ({
  getIO: jest.fn(() => ({
    to: mockIoTo,
    emit: mockIoEmit,
  })),
}));

const chatController = require("../controllers/chatController");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const httpMocks = require("node-mocks-http");
const mongoose = require("mongoose");

describe("Support Module (Chat) Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  // =========================================================================
  // TC-STU-SUP-01: Verify Creating / Getting a Conversation (HTTP)
  // (Your app sends messages via socket, so this is the closest HTTP equivalent)
  // =========================================================================
  test("TC-STU-SUP-01: Verify create-or-get conversation returns an open convo", async () => {
    const studentId = new mongoose.Types.ObjectId().toString();

    req.user = { user_id: studentId, role: "student" };
    req.body = { subject: "General Support" };

    // Mock: existing open convo found
    Conversation.findOne.mockResolvedValue({
      _id: "conv_123",
      student: studentId,
      status: "open",
      subject: "General Support",
    });

    await chatController.createOrGetConversation(req, res);

    expect(res.statusCode).toBe(201);
    expect(Conversation.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        student: studentId,
        status: "open",
        deletedForAdmin: { $ne: true },
        deletedForStudent: { $ne: true },
      })
    );

    const body = res._getJSONData();
    expect(body).toEqual(expect.objectContaining({ _id: "conv_123" }));
  });

  // =========================================================================
  // TC-STU-SUP-02: Verify Retrieval of Chat History (HTTP GET messages)
  // =========================================================================
  test("TC-STU-SUP-02: Verify retrieval of chat history by conversationId", async () => {
    const studentId = new mongoose.Types.ObjectId().toString();
    const conversationId = new mongoose.Types.ObjectId().toString();

    req.user = { user_id: studentId, role: "student" };
    req.query = { conversationId, limit: 30 };

    // ✅ must mock findById().lean()
    Conversation.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: conversationId,
        student: studentId,
        deletedForStudent: false,
        deletedForAdmin: false,
      }),
    });

    const mockMessages = [
      {
        _id: "m1",
        text: "Hi Student",
        senderRole: "admin",
        createdAt: new Date(),
      },
      {
        _id: "m2",
        text: "Hi Advisor",
        senderRole: "student",
        createdAt: new Date(),
      },
    ];

    const q = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn(),
    };

    // populate(sender) -> returns q, populate(replyTo) -> resolves messages
    q.populate.mockImplementationOnce(() => q);
    q.populate.mockImplementationOnce(() => Promise.resolve(mockMessages));

    Message.find.mockReturnValue(q);

    await chatController.getMessages(req, res);

    expect(res.statusCode).toBe(200);

    const body = res._getJSONData();
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages).toHaveLength(2);

    expect(Message.find).toHaveBeenCalledWith(
      expect.objectContaining({ conversation: conversationId })
    );
    expect(q.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(q.limit).toHaveBeenCalledWith(30);
  });
});
