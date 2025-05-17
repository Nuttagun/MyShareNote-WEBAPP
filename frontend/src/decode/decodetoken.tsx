import { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  user_id?: string;
  username?: string;
  email?: string;
  expiresIn?: number;
  iss?: string;
}

interface UserInfo {
  user_id?: string;
  username?: string;
  email?: string;
}

export function useUserInfo(): UserInfo | undefined {
  const [userInfo, setUserInfo] = useState<UserInfo>();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Token จาก localStorage:', token);


    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        if (decoded.user_id || decoded.username || decoded.email) {
        if (decoded.user_id) localStorage.setItem('user_id', decoded.user_id);
        if (decoded.email) localStorage.setItem('email', decoded.email);

          setUserInfo({
            user_id: decoded.user_id,
            username: decoded.username,
            email: decoded.email,
          });
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);

  return userInfo;
}


export function useUserID(): string | undefined {
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Token ที่ได้จาก localStorage:', token);

    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        console.log('Decoded Token:', decoded);
        if (decoded?.user_id) {
          setUserId(decoded.user_id);
          // console.log('User ID:', decoded.user_id);
        }
      } catch (error) {
        // console.error('Error decoding token:', error);
      }
    }
  }, []);

  return userId;
}