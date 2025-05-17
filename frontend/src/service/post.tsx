import axios from "axios";
import type { NotesInterface }   from "../interface/INote";

const apiUrl = "http://localhost:5002/api/notes";


const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  const type = localStorage.getItem("token_type") || "Bearer"; // fallback to Bearer
  return {
    "Content-Type": "application/json",
    Authorization: `${type} ${token}`,
  };
};

// ✅ GET all notes
export async function getNotes() {
  try {
    const response = await axios.get(apiUrl, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching notes:", error);
    return null;
  }
}

// ✅ GET one note by ID
export async function getNoteById(noteId : any) {
  try {
    const response = await axios.get(`${apiUrl}/${noteId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching note ${noteId}:`, error);
    return null;
  }
}

// ✅ CREATE a new note
export async function createNote(noteData: NotesInterface) {
  console.log(noteData)
  try {
    const response = await axios.post(apiUrl, noteData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Error creating note:", error);
    return null;
  }
}

// ✅ UPDATE a note (partial update via PATCH)
export async function updateNote(noteId : any, updateData : any) {
  try {
    const response = await axios.patch(`${apiUrl}/${noteId}`, updateData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating note ${noteId}:`, error);
    return null;
  }
}

// ✅ DELETE a note
export async function deleteNote(noteId : any) {
  try {
    const response = await axios.delete(`${apiUrl}/${noteId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(`Error deleting note ${noteId}:`, error);
    return null;
  }
}
