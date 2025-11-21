import { ArrowLeft, Hash, Mail, MessageCircle } from "lucide-react";
import MessageModal from "../Faculty/MessageModal";

const StudentProfileHeader = ({ student, messageModalOpen, setMessageModalOpen, handleBack }) => {
  return (
    <div className="h-auto bg-white shadow-sm border-b flex-shrink-0 w-full sticky top-0 z-50">
      <div className="px-4 py-4 max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition mb-2 group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="font-medium text-xs">Back to Students</span>
        </button>

        {/* Student Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
              {student.username ? student.username.charAt(0).toUpperCase() : "S"}
            </div>

            {/* Name and Info */}
            <div className="flex flex-col gap-0.5">
              <h1 className="text-lg font-semibold text-gray-900">
                {student.username || "-"}
              </h1>

              {/* Matric No and Email side by side */}
              <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                {student.matric_no && (
                  <span className="flex items-center gap-1">
                    <Hash size={12} /> {student.matric_no}
                  </span>
                )}
                {student.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} /> {student.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Send Message Button */}
          {student?._id && (
            <button
              onClick={() => setMessageModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition shadow-sm text-xs font-medium"
            >
              <MessageCircle size={14} />
              Send Message
            </button>
          )}
        </div>

        {/* Message Modal */}
        <MessageModal
          open={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          student={student}
        />
      </div>
    </div>
  );
};

export default StudentProfileHeader;
