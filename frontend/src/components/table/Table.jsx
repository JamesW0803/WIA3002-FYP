import TableActionBar from "./TableActionBar"
import SkeletonRows from "./SkeletonRows"

const Row = ({
    item,
    order,
    indexNum = -1,
    tableActionBarButton = null,
    identifier = null
}) => {
    return (
        <tr className="bg-white hover:bg-gray-100/70 transition-all duration-150 border-b border-gray-200 text-sm">
            
            {indexNum !== -1 && (
                <td className="px-5 py-3 text-gray-700 whitespace-nowrap font-medium text-sm">
                    {indexNum + 1}
                </td>
            )}

            {order.map((key) => {
                const data = item.find((rowItem) => rowItem.key === key);
                return <TableData data={data} key={key} />;
            })}

            {tableActionBarButton && (
                <TableActionBar
                    viewButton={tableActionBarButton.viewButton}
                    identifier={item.find((d) => d.key === identifier)?.value}
                    editButton={tableActionBarButton.editButton}
                    deleteButton={tableActionBarButton.deleteButton}
                    messageButton={tableActionBarButton.messageButton}
                />
            )}
        </tr>
    );
};

const TableData = ({ data }) => {
    if (!data)
        return (
            <td className="px-4 py-2.5 text-sm text-gray-500 border-b border-gray-100 ">
                -
            </td>
        );

    const baseClass =
        "px-4 py-2.5 text-sm text-gray-700 border-b border-gray-100 truncate";

    switch (data.type) {
        case "text_display":
            return <td className={baseClass}>{data.value}</td>;

        case "clickable_text_display":
            return (
                <td
                    className={`${baseClass} text-blue-600 hover:text-blue-800 cursor-pointer font-medium`}
                    onClick={data.onClick}
                >
                    {data.value}
                </td>
            );

        default:
            return <td className={baseClass}>{data.value}</td>;
    }
};

const Table = ({
    header,
    items,
    order,
    index = true,
    tableActionBarButton = null,
    identifier = null,
    loading = false
}) => {
    return (
        <div className="w-[90%] mx-auto mt-6 rounded-xl overflow-hidden border border-gray-200 shadow-md">
            {/* Outer container – adds padding so table isn't tight to the card edges */}
            <div className="overflow-auto max-h-[70vh] bg-white">
                
                <table className="w-full border-collapse text-sm">
                    
                    {/* HEADER */}
                    <thead className="sticky top-0 bg-gradient-to-b from-gray-100 to-gray-50 z-10 shadow-sm">
                        <tr className="border-b border-gray-200 text-sm">
                            {index && (
                                <th className="px-5 py-3 text-left text-sm font-bold text-gray-700 tracking-wide">
                                    No.
                                </th>
                            )}

                            {header.map((item, idx) => (
                                <th
                                    key={idx}
                                    className="px-5 py-3 text-left text-sm font-bold text-gray-700 tracking-wide"
                                >
                                    {item}
                                </th>
                            ))}

                            {tableActionBarButton && (
                                <th className="px-5 py-3 text-center text-sm font-bold text-gray-700 tracking-wide">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>

                    {/* BODY */}
                    <tbody>
                        {loading ? (
                            <SkeletonRows
                                rowCount={6}
                                colCount={
                                    header.length +
                                    (index ? 1 : 0) +
                                    (tableActionBarButton ? 1 : 0)
                                }
                            />
                        ) : (
                            items.map((item, indexNum) => (
                                <Row
                                    key={indexNum}
                                    item={item}
                                    order={order}
                                    indexNum={index ? indexNum : -1}
                                    tableActionBarButton={tableActionBarButton}
                                    identifier={identifier}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Table;
