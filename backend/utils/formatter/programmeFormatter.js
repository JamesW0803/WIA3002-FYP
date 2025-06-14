const formatProgrammes = (programmes) => {
  const formattedProgrammes = programmes.map((programme) => {
    return formatProgramme(programme);
  });

  return formattedProgrammes;
};

const formatProgramme = (programme) => {
  return {
    programme_code: programme.programme_code ?? "-",
    programme_name: programme.programme_name ?? "-",
    description: programme.description ?? "-",
    department: programme.department ?? "-",
    faculty: programme.faculty ?? "-",
  };
};

module.exports = {
  formatProgramme,
  formatProgrammes,
};
