const createStudent = async (req, res) => {
    res.json({
        message: "Student created successfully",
    })
}

module.exports = {
    createStudent,
}