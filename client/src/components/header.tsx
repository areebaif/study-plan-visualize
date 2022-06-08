import * as React from "react";
//import { Link } from "react-router-dom";
// Emotion
import styled from "@emotion/styled";
// MUI Imports
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import Link from "@mui/material/Link";
//
import AuthContext from "../auth-context";

const HeaderRoot = styled(AppBar)(({ theme }: any) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
}));
type headerProps = {
  isLoggedIn: boolean;
};
export const Header: React.FC<headerProps> = ({ isLoggedIn }) => {
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  const open = Boolean(anchorElUser);
  const ctx = React.useContext(AuthContext);
  //console.log("hello!!!!", ctx);
  console.log("userloginStatus", isLoggedIn);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    console.log("Clicked!");
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  const settings = [
    isLoggedIn && { label: "Profile", href: "/" },
    isLoggedIn && { label: "Sign out", href: "/users/signout" },
    !isLoggedIn && { label: "Sign in", href: "/users/signin" },
    !isLoggedIn && { label: "Sign up", href: "/users/signup" },
  ].filter((linkConfig) => linkConfig);
  //const settings = ["Profile", "Account", "Dashboard", "Logout"];

  return (
    <HeaderRoot position="static">
      <Toolbar disableGutters>
        <Typography color="textPrimary" variant="h4">
          Study Plan Visualize
        </Typography>
        <Box sx={{ flexGrow: 0 }}>
          <Tooltip title="Open settings">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar alt="Remy Sharp" src="/static/images/avatar/2.jpg" />
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: "45px" }}
            id="menu-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={open}
            onClose={handleCloseUserMenu}
          >
            {settings.map((setting) => {
              if (setting !== false) {
                const href = setting?.href;
                const label = setting?.label;
                return (
                  <MenuItem key={setting.label} onClick={handleCloseUserMenu}>
                    <Button href={setting.href} color="primary">
                      {setting.label}
                    </Button>
                  </MenuItem>
                );
              }
            })}
          </Menu>
        </Box>
      </Toolbar>
    </HeaderRoot>
  );
};
