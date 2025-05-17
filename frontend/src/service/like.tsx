import axios from 'axios';

const apiUrl = "http://localhost:5001/api/social";

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    const type = localStorage.getItem("token_type") || "Bearer";
    return {
        "Content-Type": "application/json",
        Authorization: `${type} ${token}`,
    };
};

// Get likes count for a note
export async function getLikesCount(noteId: string) {
    try {
        const response = await axios.get(`${apiUrl}/likes/${noteId}`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching likes count:", error);
        return null;
    }
}

// Like a note
export async function likeNote(noteId: string, userId: string, noteTitle: string, noteOwnerId: string) {
    try {
        const response = await axios.post(`${apiUrl}/like`, {
            noteId,
            userId,
            noteTitle,
            noteOwnerId
        }, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error("Error liking note:", error);
        return null;
    }
}

// Unlike a note
export async function unlikeNote(noteId: string, userId: string) {
    try {
        const response = await axios.delete(`${apiUrl}/unlike/${noteId}/${userId}`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error("Error unliking note:", error);
        return null;
    }
}

// Get all likes by user
export async function getUserLikes(userId: string) {
    try {
        const response = await axios.get(`${apiUrl}/user-likes/${userId}`, {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching user likes:", error);
        return null;
    }
}