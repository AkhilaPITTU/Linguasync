import "./Header.css";

import { useEffect, useState } from "react";

import {
    FiSearch,
    FiBell,
    FiMoon,
    FiSun,
    FiChevronDown,
    FiWifi
} from "react-icons/fi";

function Header() {

    const [darkMode, setDarkMode] = useState(true);

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {

        const timer = setInterval(() => {

            setCurrentTime(new Date());

        },1000);

        return () => clearInterval(timer);

    },[]);

    const user =
        JSON.parse(localStorage.getItem("user")) || {};

    return (

        <header className="header">

            {/* Search */}

            <div className="search-container">

                <FiSearch />

                <input

                    type="text"

                    placeholder="Search calls, translations, contacts..."

                />

            </div>

            {/* Right */}

            <div className="header-right">

                {/* Server Status */}

                <div className="server-status">

                    <FiWifi />

                    <span>Online</span>

                </div>

                {/* Date */}

                <div className="date-box">

                    {currentTime.toLocaleDateString()}

                </div>

                {/* Time */}

                <div className="time-box">

                    {currentTime.toLocaleTimeString()}

                </div>

                {/* Notification */}

                <button className="icon-button">

                    <FiBell />

                    <span className="notification-dot"></span>

                </button>

                {/* Theme */}

                <button

                    className="icon-button"

                    onClick={() => setDarkMode(!darkMode)}

                >

                    {

                        darkMode

                        ?

                        <FiSun />

                        :

                        <FiMoon />

                    }

                </button>

                {/* Profile */}

                <div className="profile-box">

                    <img

                        src="/images/user.png"

                        alt="Profile"

                    />

                    <div>

                        <h4>

                            {user.full_name || "AN Reddy"}

                        </h4>

                        <span>

                            Premium User

                        </span>

                    </div>

                    <FiChevronDown />

                </div>

            </div>

        </header>

    );

}

export default Header;