import { ChevronLeft } from "lucide-react";


const GeneralCardHeader = ({ title , handleBack }) => {
    return (
        <div className="flex items-center justify-between">
          <button 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            onClick={handleBack}
            >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-semibold">{title}</span>
          </button>
        </div>
    )
}

export default GeneralCardHeader;