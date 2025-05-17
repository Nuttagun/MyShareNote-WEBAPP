import { useEffect, useState } from "react";
import type { NotesInterface } from "../../interface/INote";
import { getNotes } from "../../service/post";
import { Card } from "antd";
import "./test.css";

const Review = () => {
  const [notes, setNotes] = useState<NotesInterface[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await getNotes();
      if (res) {
        setNotes(res.slice(0, 6)); // แสดงแค่ 6 รายการ
      }
    } catch (err) {
      setError("Failed to fetch notes");
      console.error(err);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchNotes();
  }, []);

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
            {notes.map((note, index) => (
              <Card key={note.note_id} className="review-card">
                <div className="review-container">
                  <div className="reviews-comment-text">
                    <p>Post By: {note.username ?? "Unknown User"}</p>
                    <p>{renderDescription(note.description)}</p>
                  </div>
                  <hr />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <br />
    </div>
  );
};

export default Review;
