import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqData = [
  {
    question: "How do I create a study plan?",
    answer:
      "You can create a study plan by going to the 'Planner' page and selecting your intended courses for each semester. The system will guide you through the process and provide recommendations based on your academic progress.",
  },
  {
    question: "Can I edit my submitted courses?",
    answer:
      "Yes, you can edit your courses at any time. Simply go to your Academic Profile and click on the 'Edit' icon next to each course to make changes. Changes are saved automatically.",
  },
  {
    question: "How are prerequisites handled?",
    answer:
      "The system automatically checks for prerequisite completion before allowing you to add a course. If you're missing prerequisites, you'll see a warning message with details about the required courses.",
  },
  {
    question: "What happens if I exceed the credit hour limit?",
    answer:
      "The system will notify you immediately if you exceed the 22 credit hour limit per semester. You won't be able to submit your plan until you adjust your course load to stay within the limit.",
  },
];

const FAQsPage = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-[#1E3A8A] mb-2">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-600">
          Find answers to common questions about academic planning
        </p>
      </div>

      <div className="space-y-4">
        {faqData.map((faq, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <button
              className={`w-full flex items-center justify-between p-6 text-left font-medium text-lg transition-colors ${
                openIndex === index
                  ? "bg-[#1E3A8A] text-white"
                  : "bg-white text-gray-800 hover:bg-gray-50"
              }`}
              onClick={() => toggleFAQ(index)}
            >
              <span>{faq.question}</span>
              {openIndex === index ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                openIndex === index ? "max-h-96" : "max-h-0"
              }`}
            >
              <div className="p-6 bg-gray-50 text-gray-700 border-t border-gray-200">
                {faq.answer}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center text-gray-500 text-sm">
        Still have questions? Contact our support team at
        22004837@siswa.um.edu.my
      </div>
    </div>
  );
};

export default FAQsPage;
