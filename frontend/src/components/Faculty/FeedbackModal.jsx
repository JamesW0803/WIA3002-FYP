import { useState } from "react";
import axiosClient from "../../api/axiosClient";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useChatStore from "../../stores/useChatStore";

const FeedbackModal = ({ open, onClose, student, coursePlan }) => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { getUploadUrl, putToAzure, sendMessage } = useChatStore();


  if (!open) return null;

  const handleSend = async (redirect = false) => {
    if (!text.trim()) return;
    if (!coursePlan) return;

    setLoading(true);

    try {
      const attachments = [];

      // 2️⃣ Build JSON like SharePlanModal
      const pretty = JSON.stringify(coursePlan, null, 2);
      const blob = new Blob([pretty], { type: "application/json" });

      const filename = `CoursePlan_${coursePlan.name
        ?.replace(/[^\w.-]+/g, "_")
        .slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.json`;

      const file = new File([blob], filename, { type: "application/json" });

      // 3️⃣ Upload to Azure (same steps as SharePlanModal)
      const { uploadUrl, blobUrl } = await getUploadUrl({
        filename,
        mimeType: "application/json",
      });

      await putToAzure({ uploadUrl, file });

      attachments.push({
        url: blobUrl,
        name: filename,
        mimeType: "application/json",
        size: file.size,
        caption: "Academic plan export",
        originalUrl: blobUrl,
        originalName: filename,
        originalMimeType: "application/json",
        originalSize: file.size,
      });

      await sendMessage(null, text, attachments, student._id);
      const convoId = useChatStore.getState().activeConversationId;

      // 5️⃣ Redirect or show success
      if (redirect) {
        navigate(`/admin/helpdesk`, { state: { conversationId: convoId }});
      } else {
        alert("Feedback sent with course plan attached!");
      }

      onClose();
      setText("");
    } catch (err) {
      console.error(err);
      alert("Failed to send feedback");
    }

    setLoading(false);
  };


  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[450px] p-5 rounded-lg relative shadow-lg">

        {/* Close */}
        <button className="absolute right-4 top-4" onClick={onClose}>
          <X size={22} className="text-gray-500 hover:text-black"/>
        </button>

        <h2 className="text-lg font-semibold mb-2">
          Feedback for Course Plan
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          This feedback will be sent to <b>{student.username}</b> in Helpdesk.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Write your feedback..."
          className="w-full border rounded p-2"
        />

        <div className="flex justify-end gap-2 mt-4">

          <button
            onClick={() => handleSend(false)}
            disabled={loading}
            className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Send
          </button>

          <button
            onClick={() => handleSend(true)}
            disabled={loading}
            className="px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Send & Open Chat
          </button>

        </div>

      </div>
    </div>
  );
};

export default FeedbackModal;
