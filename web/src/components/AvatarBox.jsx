import { Box, styled, Typography } from "@mui/material";

const AvatarBoxContainer = styled(Box)`
  display: flex;
  flex-grow: 1;
  justify-content: center;
  flex-direction: column;
  align-content: center;
  align-items: center;
  height: 100dvh;
  max-width: min(400px, 90dvw);
  margin: auto;
`;

const CoopMonogram = () => (
  <Box
    component="img"
    src="/static/images/coop.png"
    alt="Coop"
    sx={{
      m: 2,
      width: 64,
      height: 64,
      imageRendering: "pixelated",
      border: "3px solid var(--coop-black)",
      boxShadow: "2px 2px 0 var(--coop-accent)",
    }}
  />
);

const AvatarBox = (props) => (
  <AvatarBoxContainer>
    <CoopMonogram />
    <Typography
      variant="h5"
      sx={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        mb: 1,
      }}
    >
      Coop
    </Typography>
    {props.children}
  </AvatarBoxContainer>
);

export default AvatarBox;
