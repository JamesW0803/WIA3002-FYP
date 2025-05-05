import { CheckCircle, XCircle } from "lucide-react";

export default function SignUpModal({ show, success, role, onClose, onRetry }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
        {success ? (
          <>
            <CheckCircle className="text-green-500 mx-auto" size={64} />
            <h2 className="text-xl font-semibold mt-4 text-green-600">
              Sign Up Successful
            </h2>
            <p className="mt-2">
              You have successfully signed up as <strong>{role}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              OK
            </button>
          </>
        ) : (
          <>
            <XCircle className="text-red-500 mx-auto" size={64} />
            <h2 className="text-xl font-semibold mt-4 text-red-600">
              Sign Up Failed
            </h2>
            <p className="mt-2">
              There was a problem during sign-up. Please try again.
            </p>
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
