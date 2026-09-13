import "./ShowUIButton.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const ShowUIButton = ({ visible = false, onToggle }) => {

    return (

        <button
            className="show-ui-button"
            type="button"
            onClick={onToggle}
            title={visible ? "Hide meeting panel" : "Show meeting panel"}
            aria-expanded={visible}
        >

            {visible ? <FaEyeSlash /> : <FaEye />}

            <span>{visible ? "Hide UI" : "Show UI"}</span>

        </button>

    );

};

export default ShowUIButton;
