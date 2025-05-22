import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Mic,
  Smile,
  ChevronDown,
  Circle,
  CheckCheck,
} from "lucide-react";

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() === "") return;

    const newMessage = {
      sender: "student",
      name: "You",
      content: input,
      timestamp: new Date(),
      read: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    // Simulate advisor response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "advisor",
          name: "Academic Advisor",
          content:
            "Thanks for your message. I'll review your academic record and get back to you with detailed advice soon.",
          timestamp: new Date(),
          read: true,
        },
      ]);
    }, 2000);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 p-4 hidden md:flex flex-col">
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
              <div className="flex items-center p-2 rounded-lg hover:bg-gray-100 text-gray-700">
                <div className="w-2 h-2 bg-transparent rounded-full mr-3"></div>
                <span>Course Planning</span>
              </div>
              <div className="flex items-center p-2 rounded-lg hover:bg-gray-100 text-gray-700">
                <div className="w-2 h-2 bg-transparent rounded-full mr-3"></div>
                <span>Degree Requirements</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase font-medium text-gray-500 mb-2 tracking-wider">
              Direct Messages
            </h3>
            <div className="space-y-1">
              <div className="flex items-center p-2 rounded-lg bg-blue-50">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center mr-3 text-white font-medium">
                  AA
                </div>
                <div>
                  <div className="font-medium text-gray-800">
                    Academic Advisor
                  </div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <Circle className="w-2 h-2 text-green-500 mr-1 fill-current" />
                    Online
                  </div>
                </div>
              </div>
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
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 font-medium">
              AA
            </div>
            <div>
              <h1 className="font-semibold text-gray-800">Academic Advisor</h1>
              <p className="text-xs text-gray-500 flex items-center">
                <Circle className="w-2 h-2 text-green-500 mr-1 fill-current" />
                Online - Active now
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {/* Date separator */}
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
                  <span>{formatTime(new Date(msg.timestamp))}</span>
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
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-800"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-800"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
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
