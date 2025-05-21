import { Button } from "@mui/material"
import Profile from "../../assets/profile-test.jpg"
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import React, { useEffect, useState } from "react";
import Divider from '@mui/material/Divider';
import { FaRegUser } from "react-icons/fa";
import { PiSignOutBold } from "react-icons/pi";
import { Link, useNavigate } from "react-router-dom"
import SUTHLOGO from "../../assets/logo.png"
import { CgNotes } from "react-icons/cg";
import NotificationBell from "../notification/notification";
import { useUserInfo } from "../../decode/decodetoken";
import { useUserID } from "../../decode/decodetoken";
  

const AppBar = () => {
  const navigate = useNavigate();// @ts-ignore
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const userInfo = useUserInfo();
  const uId = useUserID();
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/auth');

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsername(payload.username || payload.name || payload.email); // รองรับหลายชื่อ field
        setUserId(payload.userId || payload.sub || null); 
      } catch (error) {
        localStorage.removeItem('token');
        navigate('/auth');
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('token_type');
    navigate('/auth');
  };

  const [anchorMyAcc, setAnchorMyAcc] = React.useState<null | HTMLElement>(null);
  const openMyAcc = Boolean(anchorMyAcc);

  const handleClickMyAcc = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorMyAcc(event.currentTarget);
  };

  const handleCloseMyAcc = () => {
    setAnchorMyAcc(null);
  };

  const handleClickHardware = () => {
    navigate('/mypost'); 
  };


  return (
    <div>
      <header className="w-full h-[auto] py-2 pl-8 shadow-md pr-7 bg-[#fff] border-b flex items-center justify-between">
        <div className="part1 flex items-center gap-5">
          <Link to="/">
            <img src={SUTHLOGO} alt="Hospital SUT" className="w-[50px]" />
          </Link>

          <Button
            className="!text-black !normal-case flex items-center gap-1"
            onClick={handleClickHardware}
          >
            <span className="text-[16px] font-[600] flex">
              <CgNotes className="ml-1 w-6 mt-1 mr-1" />
              My Note
            </span>
          </Button>
        </div>

        <div className="part2 w-[40%] flex items-center justify-end gap-4">

          <NotificationBell userId={uId!} />



          <div className="relative">
            <div
              className="rounded-full w-[35px] h-[35px] overflow-hidden cursor-pointer"
              onClick={handleClickMyAcc}
            >
              <img src={Profile} className="w-full h-full object-cover" />
            </div>
            <Menu
              anchorEl={anchorMyAcc}
              id="account-menu"
              open={openMyAcc}
              onClose={handleCloseMyAcc}
              onClick={handleCloseMyAcc}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    mt: 1.5,
                    '&::before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem className="!bg-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-full w-[35px] h-[35px] overflow-hidden cursor-pointer">
                    <img src={Profile} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="info">
                  <h3 className="text-[15px] font-[400] leading-5 ml-2">{userInfo?.username}</h3>
                  <p className="text-[12px] font-[400] opacity-70 ml-3">{userInfo?.email}{uId}</p>
                </div>
              </MenuItem>
              <Divider />

              <MenuItem className="flex items-center gap-3">
                <FaRegUser className="text-[16px]" />
                <span className="text-[14px]">Profile</span>
              </MenuItem>

              <MenuItem className="flex items-center gap-3">
                <PiSignOutBold className="text-[18px]" />
                <span className="text-[14px]" onClick={handleLogout}>Sign Out</span>
              </MenuItem>
            </Menu>
          </div>
        </div>
      </header>
    </div>
  );
};

export default AppBar;
