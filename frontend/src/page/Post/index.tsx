import { useEffect, useState } from "react";
import type { NotesInterface } from "../../interface/INote";
import { getNotes } from "../../service/post";
import { Card, Button } from "antd";
import ModalReview from "./modal";
import "./test.css";
import "../../component/like/cute_like_button.css"; // Import the cute styles
import { getLikesCount, likeNote, unlikeNote, getUserLikes } from "../../service/like";
import CuteLikeButton from "../../component/like/cute_like_button_component.tsx";

const Review = ({ refresh }: { refresh: boolean }) => {
  const [notes, setNotes] = useState<NotesInterface[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  // New states for likes functionality
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [userLikedNotes, setUserLikedNotes] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>("");

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await getNotes();
      if (res) {
        setNotes(res.slice(0, 6)); // แสดงแค่ 6 รายการ
        // Fetch likes count for each note
        res.slice(0, 6).forEach((note : any) => {
          fetchLikesCount(note.note_id);
        });
      }
    } catch (err) {
      setError("Failed to fetch notes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch likes count for a specific note
  const fetchLikesCount = async (noteId: string) => {
    try {
      const response = await getLikesCount(noteId);
      if (response) {
        setLikesCount((prev) => ({
          ...prev,
          [noteId]: response.likes,
        }));
      }
    } catch (err) {
      console.error("Error fetching likes count:", err);
    }
  };

  // Fetch user's liked notes
  const fetchUserLikes = async () => {
    try {
      // Get user ID from localStorage or context
      const currentUserId = localStorage.getItem("user_id");
      if (currentUserId) {
        setUserId(currentUserId);
        const response = await getUserLikes(currentUserId);
        if (response && response.likes) {
          const likedNoteIds = response.likes.map((like : any) => like.note_id);
          setUserLikedNotes(likedNoteIds);
        }
      }
    } catch (err) {
      console.error("Error fetching user likes:", err);
    }
  };

  // Handle like/unlike action
  const handleLikeToggle = async (note: NotesInterface) => {
    try {
      if (!userId) {
        // Handle case where user is not logged in
        console.error("User not logged in");
        return;
      }

      const noteId = note.note_id ?? "";
      const isLiked = userLikedNotes.includes(noteId);

      if (isLiked) {
        // Unlike the note
        await unlikeNote(noteId, userId);
        setUserLikedNotes((prev) => prev.filter((id) => id !== noteId));
        setLikesCount((prev) => ({
          ...prev,
          [noteId]: Math.max(0, (prev[noteId] || 0) - 1),
        }));
      } else {
        // Like the note
        await likeNote(noteId, userId, note.title || "", note.user_id || "");
        setUserLikedNotes((prev) => [...prev, noteId]);
        setLikesCount((prev) => ({
          ...prev,
          [noteId]: (prev[noteId] || 0) + 1,
        }));
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const truncateText = (text?: string) => {
    if (!text) return "";
    return text.length > 100 ? `${text.slice(0, 100)}...` : text;
  };

  const renderDescription = (description?: string) => {
    if (!description) return null;
    const truncated = truncateText(description);
    return <span dangerouslySetInnerHTML={{ __html: truncated }} />;
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  useEffect(() => {
    fetchNotes();
    fetchUserLikes(); // Fetch user's liked notes on component mount
  }, [refresh]);

  if (notes.length === 0) {
    return (
      <div className="cards">
        <h1>No Data Available</h1>
      </div>
    );
  }

  return (
    <div>
      <header>
        <center className="reviews-overview">
          <h1>Post Notes</h1>
        </center>
      </header>

      <div className="box-course-profile">
        {loading ? (
          <p>Loading notes...</p>
        ) : error ? (
          <p>{error}</p>
        ) : (
          <div className="reviews-grid">
            {notes.map((note, index) => {
              const noteId = note.note_id;
              console.log(index)
              if (!noteId) return null;
              const isLiked = userLikedNotes.includes(noteId);
              const likeCount = likesCount[noteId] || 0;
              
              return (
                <Card 
                  key={noteId} 
                  className={`review-card ${isLiked ? 'liked-note' : ''}`}
                >
                  <div className="review-container">
                    <div className="reviews-comment-text">
                      <p>Post By : {note.username ?? "Unknown User"}</p>
                      <p>Title : {note.title}</p>
                      <p>{renderDescription(note.description)}</p>
                    </div>
                    <hr />
                    <div className="review-actions">
                      {/* Replace the standard button with our cute like button */}
                      <CuteLikeButton 
                        isLiked={isLiked}
                        likeCount={likeCount}
                        onLikeToggle={() => handleLikeToggle(note)}
                        disabled={!userId}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <footer>
        <center className="reviews-readmore">
          <Button 
            type="link" 
            style={{
              display: 'block',
              textAlign: 'center',
              color: '#002A48',
              margin: '10px 0',
            }} 
            onClick={showModal}
          >
            Read More Post Note
          </Button>
        </center>
      </footer>
      <ModalReview isVisible={isModalVisible} handleCancel={handleCancel} refresh={refresh} />
      <br />
    </div>
  );
};

export default Review;
