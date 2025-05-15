import axios from "axios";

const apiUrl = "http://localhost:5002";

const Authorization = localStorage.getItem("token");
const Bearer = localStorage.getItem("token_type");

const requestOptions = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `${Bearer} ${Authorization}`,
  },
};

export async function getNotes() {
  try {
    const response = await axios.get(`${apiUrl}/api/notes`, requestOptions);
    return response.data;
  } catch (error) {
    console.error("Error fetching notes:", error);
    return null;
  }
}
