export const formatDateToLocaleString = ( stringDate ) => {
    const date = new Date(stringDate);
    const formatted = date.toLocaleString("en-MY", {
        dateStyle: "medium",
        timeStyle: "short"
    });

    return formatted;

}
