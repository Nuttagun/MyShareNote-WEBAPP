// components/Blog.tsx
import { useEffect, useState } from "react";
import "./post.css";
import { getNotes } from "../../service/post";
import type { NotesInterface } from "../../interface/INote";
import { ArrowRight, ArrowLeft } from "lucide-react";
import Aos from "aos";
import "aos/dist/aos.css";
import picture_test from "../../assets/test.jpg"

const Blog = () => {
  const [animals, setAnimals] = useState<NotesInterface[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;

  const getAnimals = async () => {
    console.log("Fetching notes data...");
    try {
      const res = await getNotes();
      console.log("ListNote response:", res);
      if (Array.isArray(res)) {
        const mapped = res.map((note: any) => ({
          ID: note.note_id,
          Picture: "default.jpg",
          Name: note.title,
          Description: note.description,
        }));
        setAnimals(mapped);
      } else {
        console.error("Invalid response format:", res);
        setAnimals([]);
      }
    } catch (error) {
      console.error("Error fetching notes data:", error);
      setAnimals([]);
    }
  };

  const nextPage = () => {
    if ((currentPage + 1) * itemsPerPage < animals.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  useEffect(() => {
    getAnimals();
    Aos.init({ duration: 2000 });
  }, []);

  const displayedAnimals = animals.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <section className="blog container section">
      <div className="secContainer">
        <div className="secIntro">
          <h2 data-aos="fade-up" data-aos-duration="2000" className="secTitle">
            The Pride of Our Website Note?
          </h2>
          <p data-aos="fade-up" data-aos-duration="2500">
            An insight to the incredible experience in the Website.
          </p>
        </div>

        <div className="mainContainer grid">
          {displayedAnimals.map(({ ID, Picture, Name, Description }) => (
            <div key={ID} className="singlePost grid">
              <div
                data-aos="fade-up"
                data-aos-duration="2000"
                className="imgDiv"
              >
                <img
                  src={picture_test}
                  alt="Animal image"
                  className="img-test"
                />
              </div>
              <div className="postDetails">
                <h3 data-aos="fade-up" data-aos-duration="2500">
                  {Name}
                </h3>
                <p data-aos="fade-up" data-aos-duration="3000">
                  {Description
                    ? Description.length > 1
                      ? `${Description.slice(0, 300)}`
                      : Description
                    : "No description available"}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div
          className="pagination-buttons"
          style={{ display: "flex", justifyContent: "flex-end" }}
        >
          <button
            className="circle-button"
            onClick={prevPage}
            disabled={currentPage === 0}
          >
            <ArrowLeft />
          </button>

          <button
            className="circle-button"
            onClick={nextPage}
            disabled={(currentPage + 1) * itemsPerPage >= animals.length}
          >
            <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Blog;
