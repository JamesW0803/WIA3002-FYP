import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, ChevronDown, CheckCheck } from "lucide-react";

const ContactAdvisorPage = () => {
  const [messages, setMessages] = useState([
    {
      sender: "advisor",
      name: "Academic Advisor",
      content: "Hi! Feel free to ask any questions about your academic plan.",
      timestamp: new Date(),
      read: true,
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add student message
    setMessages((prev) => [
      ...prev,
      {
        sender: "student",
        name: "You",
        content: input,
        timestamp: new Date(),
        read: false,
      },
    ]);
    setInput("");

    // Simulate advisor response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "advisor",
          name: "Academic Advisor",
          content:
            "Thanks for your message. I'll review your academic record and get back to you soon.",
          timestamp: new Date(),
          read: true,
        },
      ]);
    }, 2000);
  };

  // Format helpers
  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:flex md:w-72 bg-white border-r border-gray-200 p-4 flex-col">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-800">
            Academic Support
          </h2>
          <ChevronDown className="h-5 w-5 text-gray-500" />
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto">
          <div>
            <h3 className="text-xs uppercase font-medium text-gray-500 mb-2 tracking-wider">
              Channels
            </h3>
            <div className="space-y-1">
              <div className="flex items-center p-2 rounded-lg bg-blue-50 text-blue-700">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                <span className="font-medium">Advisor Chat</span>
              </div>
              {["Course Planning", "Degree Requirements"].map((item) => (
                <div
                  key={item}
                  className="flex items-center p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  <div className="w-2 h-2 bg-transparent rounded-full mr-3"></div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase font-medium text-gray-500 mb-2 tracking-wider">
              Direct Messages
            </h3>
            <div className="flex items-center p-2 rounded-lg bg-blue-50">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center mr-3 text-white font-medium">
                AA
              </div>
              <div className="font-medium text-gray-800">Academic Advisor</div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center mr-3 text-white font-medium">
              JD
            </div>
            <div>
              <div className="font-medium text-gray-800">jwyn0803</div>
              <div className="text-xs text-gray-500">Student</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 font-medium">
              AA
            </div>
            <h1 className="font-semibold text-gray-800">Academic Advisor</h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-3 text-xs font-medium text-gray-500 bg-gray-50 rounded-full">
              {formatDate(new Date())}
            </span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-4 flex ${
                msg.sender === "student" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender === "advisor" && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 mt-1 font-medium text-sm">
                  AA
                </div>
              )}
              <div
                className={`max-w-xl ${
                  msg.sender === "student" ? "flex flex-col items-end" : ""
                }`}
              >
                {msg.sender === "advisor" && (
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    {msg.name}
                  </div>
                )}
                <div
                  className={`px-4 py-2 rounded-lg ${
                    msg.sender === "student"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
                  }`}
                >
                  <div className="text-sm">{msg.content}</div>
                </div>
                <div
                  className={`text-xs mt-1 flex items-center ${
                    msg.sender === "student"
                      ? "text-gray-500 justify-end space-x-1"
                      : "text-gray-400"
                  }`}
                >
                  <span>{formatTime(msg.timestamp)}</span>
                  {msg.sender === "student" && (
                    <CheckCheck
                      className={`w-3 h-3 ${
                        msg.read ? "text-blue-500" : "text-gray-400"
                      }`}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-gray-500">
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className={`p-2 rounded-full ${
                input.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactAdvisorPage;
