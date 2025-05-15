import picture1 from "../../assets/3405349.jpg";
import { FaPlus } from "react-icons/fa6";
import {
  Button,
} from "@mui/material";
import { MdWavingHand } from "react-icons/md";

const index = () => {
  return (
    <div className="w-full py-2 px-5 border bg-white border-[rgba(0,0,0,0.1)] flex items-center gap-8 mb-5 justify-between rounded-md">
        <div className="info">
          <h1 className="text-[35px] font-bold leading-11 mb-">
            Good Morning,<br />
            <span className="inline-flex items-center gap-2">
              My Member <MdWavingHand size={35} className="text-yellow-400 ml-1" />
            </span>
          </h1>
          <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Recusandae minus ea vel, error quaerat fugiat accusamus ratione repudiandae impedit labore praesentium, sunt quae reiciendis asperiores sapiente laborum sed id. Pariatur?</p>
          <br />
          <Button className="btn-blue !capitalize"><FaPlus className="mr-2" />Post Note</Button>
        </div>
        <img src={picture1} className="w-[230px]" />
      </div>
  )
}

export default index