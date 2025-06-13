import TableActionBar from "./TableActionBar"

const Row = ({
    item, 
    order, 
    indexNum = -1, 
    tableActionBarButton = null,
    identifier = null
}) => {
    return (
        <tr>
            {indexNum !== -1 && <td>{indexNum+1}</td>}
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
                    // editButton={tableActionBarButton.editButton}
                    deleteButton={tableActionBarButton.deleteButton}
                />
            }
        </tr>
    )
}

const TableData = ({ data }) => {
    switch (data.type) {
        case "text_display":
            return <td className="p-2" key={data.key}>{data.value}</td>
        case "clickable_text_display":
            return <td className="p-2" key={data.key} onClick={data.onClick}>{data.value}</td>
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
        <table className="m-5 ml-10">
            <thead>
                <tr>
                    {index && <th>No.</th>}
                    {
                        header.map((item) => {
                            return (
                                <th className="p-2">{item}</th>
                            )
                        })
                    }
                    {tableActionBarButton && <th>Actions</th>}
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