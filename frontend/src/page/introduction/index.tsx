import { useState, useEffect } from "react";
import picture1 from "../../assets/3405349.jpg";
import { FaPlus } from "react-icons/fa6";
import { Button } from "@mui/material";
import { MdWavingHand } from "react-icons/md";
import ModalCreate from "../CreatePost/index";
import Post from '../Post/index'

const Index = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [user, setUser] = useState<number>(
    Number(localStorage.getItem("user_id")) || 0
  );
  const [refreshPost, setRefreshPost] = useState(false);

  useEffect(() => {
    setUser(Number(localStorage.getItem("user_id")));
  }, []);

  const CourseID = 1;
  const UserID = user;

  const handleNoteSubmit = (courseId: number) => {
    console.log("Note submitted for course:", courseId);
    setRefreshPost(prev => !prev);
  };

  return (
    <>
      <div className="w-full py-2 px-5 border bg-white border-[rgba(0,0,0,0.1)] flex items-center gap-8 mb-5 justify-between rounded-md">
        <div className="info">
          <h1 className="text-[35px] font-bold leading-11 mb-">
            Good Morning,<br />
            <span className="inline-flex items-center gap-2">
              My Member <MdWavingHand size={35} className="text-yellow-400 ml-1" />
            </span>
          </h1>
          <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Recusandae minus ea vel...</p>
          <br />
          <Button
            className="btn-blue !capitalize"
            onClick={() => setModalOpen(true)}
          >
            <FaPlus className="mr-2" />
            Post Note
          </Button>
        </div>
        <img src={picture1} className="w-[230px]" />

        <ModalCreate
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          CourseID={CourseID}
          UserID={UserID}
          onReviewSubmit={handleNoteSubmit}
        />
      </div><br />
      <Post refresh={refreshPost} />
    </>
  );
};

export default Index;
