import InfoPair from "./InfoPair"

const InfoTable = ( {items} ) => {
    const mid = Math.ceil(items.length / 2);
    const col1 = items.slice(0, mid);
    const col2 = items.slice(mid);

    return (
        <div className="flex flex-row justify-center mt-10 ">
            <div className="flex flex-col w-[45%]">
                {
                    col1.map((item, index) => 
                        <InfoPair label={item[0]} value={item[1]}/>
                    )
                } 
            </div>
            <div className="flex flex-col w-[45%]">
               {
                    col2.map((item, index) => 
                        <InfoPair label={item[0]} value={item[1]}/>
                    )
                }
            </div>
        </div>
    )
}

export default InfoTable