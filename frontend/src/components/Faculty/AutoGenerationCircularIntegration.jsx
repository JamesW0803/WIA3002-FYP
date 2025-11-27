import * as React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { green } from "@mui/material/colors";
import Button from "@mui/material/Button";
import Fab from "@mui/material/Fab";
import CheckIcon from "@mui/icons-material/Check";
import SaveIcon from "@mui/icons-material/Save";

export default function AutoGenerationCircularIntegration({
  onGenerate,
  success = false,
  setSuccess,
}) {
  const [loading, setLoading] = React.useState(false);
  const timer = React.useRef(undefined);

  const buttonSx = {
    ...(success && {
      bgcolor: green[500],
      "&:hover": {
        bgcolor: green[700],
      },
    }),
  };

  React.useEffect(() => {
    return () => {
      clearTimeout(timer.current);
    };
  }, []);

  const handleButtonClick = async () => {
    if (!loading) {
      setSuccess(false);
      setLoading(true);

      try {
        await onGenerate(); // Wait for onGenerate to finish
        setSuccess(true);
      } catch (err) {
        console.error("Error generating programme plan", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0, mb: 1 }}>
      <Box sx={{ position: "relative" }}>
        <Fab
          aria-label="save"
          color="primary"
          size="small" // smaller Fab
          sx={buttonSx}
          onClick={handleButtonClick}
        >
          {success ? (
            <CheckIcon fontSize="small" />
          ) : (
            <SaveIcon fontSize="small" />
          )}
        </Fab>
        {loading && (
          <CircularProgress
            size={48} // smaller progress
            sx={{
              color: green[500],
              position: "absolute",
              top: -4,
              left: -4,
              zIndex: 1,
            }}
          />
        )}
      </Box>
      <Box sx={{ position: "relative" }}>
        <Button
          variant="contained"
          sx={buttonSx}
          disabled={loading}
          onClick={handleButtonClick}
          size="small" // smaller button
        >
          Generate default programme plan
        </Button>
        {loading && (
          <CircularProgress
            size={20} // smaller inline progress
            sx={{
              color: green[500],
              position: "absolute",
              top: "50%",
              left: "50%",
              marginTop: "-10px",
              marginLeft: "-10px",
            }}
          />
        )}
      </Box>
    </Box>
  );
}
