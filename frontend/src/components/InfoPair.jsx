
const InfoPair = ({ label , value }) => {
    return (
        <div className="flex w-full">
            <span className="font-semibold mx-10 my-2 w-1/4 whitespace-nowrap">
                {label}
            </span>
            <span className="text-left mx-10 my-2 w-3/4">
                {value}
            </span>
        </div>
    )
}


export default InfoPair