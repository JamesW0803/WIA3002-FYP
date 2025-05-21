const Row = ({item, order, indexNum = -1}) => {
    return (
        <tr>
            {indexNum !== -1 && <td>{indexNum+1}</td>}
            {   
                order.map((key) => {
                    return (
                        <td>
                            {item[key] || "-"}
                        </td>
                    )
                })
            }
        </tr>
    )
}

const Table = ({header, data, order, index = true }) => {
    console.log("Table data: ", data);
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
                    data.map((item, indexNum) => {
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