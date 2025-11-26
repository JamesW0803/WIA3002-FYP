import { Box } from "@mui/material";

const CoursePlanBadge = ({ isPlan }) => {
  const label = isPlan ? "Planned" : "Completed";
  const bg = isPlan ? "#bbdefb" : "#c8e6c9";
  const color = isPlan ? "#0d47a1" : "#1b5e20";

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 2,         // increased from 1.5 → 2
        py: 0.6,       // increased from 0.3 → 0.6
        borderRadius: "10px", // increased for pill effect
        backgroundColor: bg,
        color: color,
        fontSize: "0.85rem",  // increased from 0.75rem
        fontWeight: 600,
        lineHeight: 1.2,      // better visual balance
        userSelect: "none",
      }}
    >
      {label}
    </Box>
  );
};

export default CoursePlanBadge;
