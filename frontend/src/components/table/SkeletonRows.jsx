const SkeletonRows = ({ rowCount = 6, colCount }) => {
    return (
        <>
            {Array.from({ length: rowCount }).map((_, rowIdx) => (
                <tr key={rowIdx} className="animate-pulse bg-white">
                    {Array.from({ length: colCount }).map((_, colIdx) => (
                        <td key={colIdx} className="px-6 py-4">
                            <div className="h-4 w-full bg-gray-200 rounded-md"></div>
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
};

export default SkeletonRows;