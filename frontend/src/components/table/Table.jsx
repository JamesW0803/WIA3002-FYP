import TableActionBar from "./TableActionBar"

const Row = ({
    item, 
    order, 
    indexNum = -1, 
    tableActionBarButton = null,
    identifier = null
}) => {
    return (
        <tr className="bg-white shadow-sm rounded">
            {indexNum !== -1 && 
            <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">
                {indexNum+1}
                </td>}
            {   
                order.map((key) => {
                    const data = item.find((data) => data.key === key)
                    return (
                        <TableData data={data}  />
                    )
                })
            }
            {tableActionBarButton && 
                <TableActionBar
                    viewButton={tableActionBarButton.viewButton}
                    identifier={item.find(data => data.key === identifier)?.value}
                    editButton={tableActionBarButton.editButton}
                    deleteButton={tableActionBarButton.deleteButton}
                />
            }
        </tr>
    )
}

const TableData = ({ data }) => {
    if (!data) return <td className="px-6 py-4">-</td>; // fallback
    switch (data.type) {
        case "text_display":
            return (
                <td className="px-6 py-4 text-sm text-gray-800 " key={data.key}>
                {data.value}
                </td>
            )
        case "clickable_text_display":
            return (
                    <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap" key={data.key} onClick={data.onClick}>{data.value}</td>
            )
    }
}

const Table = ({
    header, 
    items, 
    order, 
    index = true,
    tableActionBarButton = null,
    identifier = null
}) => {
    return (
        <table className="w-[90%] table-auto border-separate border-spacing-y-2 pl-10">
            <thead>
                <tr className="bg-blue-300">
                    {index && 
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 bg-[#e3eefe] rounded">
                            No.
                        </th>}
                    {
                        header.map((item) => {
                            return (
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 bg-[#e3eefe] rounded">
                                    {item}
                                </th>
                            )
                        })
                    }
                    {tableActionBarButton && 
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 bg-[#e3eefe] rounded">
                        Actions
                    </th>}
                </tr>
            </thead>
            <tbody>
                {
                    items.map((item, indexNum) => (
                        <Row 
                            item={item} 
                            order={order} 
                            indexNum={indexNum}
                            tableActionBarButton={tableActionBarButton}
                            identifier={identifier}
                        />        
                    ))
                }
            </tbody>
        </table>
    )
}

export default Table;