import axios from "axios";
const apiUrl = "http://localhost:5003";
console.log(apiUrl);

const Authorization = localStorage.getItem("token");

const Bearer = localStorage.getItem("token_type");

const requestOptions = {
  headers: {
    "Content-Type": "application/json",

    Authorization: `${Bearer} ${Authorization}`,
  },
};

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LogInPayload {
  email: string;
  password: string;
}

async function Register(data: RegisterPayload) {
  return await axios
    .post(`${apiUrl}/auth/register`, data, requestOptions)
    .then((res) => res)
    .catch((e) => e.response);
}

async function LogIn(data: LogInPayload) {
  return await axios
    .post(`${apiUrl}/auth/login`, data, requestOptions)
    .then((res) => res)
    .catch((e) => e.response);
}
export { Register, LogIn };
