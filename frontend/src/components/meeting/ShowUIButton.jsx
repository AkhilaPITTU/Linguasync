import "./ShowUIButton.css";
import { FaEye } from "react-icons/fa";

const ShowUIButton = ({ onShow }) => {

    return (

        <button
            className="show-ui-button"
            onClick={onShow}
            title="Show Workspace"
        >

            <FaEye />

            <span>Show UI</span>

        </button>

    );

};

export default ShowUIButton;