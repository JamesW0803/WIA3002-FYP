const Row = ({item, order, indexNum = -1}) => {
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
        </tr>
    )
}

const TableData = ({ data }) => {
    switch (data.type) {
        case "text_display":
            return <td key={data.key}>{data.value}</td>
        case "clickable_text_display":
            return <td key={data.key} onClick={data.onClick}>{data.value}</td>
    }
}

const Table = ({
    header, 
    items, 
    order, 
    index = true 
}) => {
    return (
        <table>
            <thead>
                <tr>
                    {index && <th>No.</th>}
                    {
                        header.map((item) => {
                            return (
                                <th>{item}</th>
                            )
                        })
                    }
                </tr>
            </thead>
            <tbody>
                {
                    items.map((item, indexNum) => {
                        if(index)
                            return <Row item={item} order={order} indexNum={indexNum}/>        
                        else
                            return <Row item={item} order={order}/>        
                    })
                }
            </tbody>
        </table>
    )
}

export default Table;