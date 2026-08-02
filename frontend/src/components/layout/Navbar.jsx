import { useState, useEffect } from "react";
import { Link as ScrollLink } from "react-scroll";
import { Link } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import "./Navbar.css";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className={scrolled ? "navbar scrolled" : "navbar"}>
      <div className="logo">
        🌐 <span>LINGUASYNC</span>
      </div>

      <nav className={menuOpen ? "nav-links active" : "nav-links"}>
        <ScrollLink
          to="home"
          smooth={true}
          duration={600}
          offset={-80}
          spy={true}
          activeClass="active"
          onClick={closeMenu}
        >
          Home
        </ScrollLink>

        <ScrollLink
          to="features"
          smooth={true}
          duration={600}
          offset={-80}
          spy={true}
          activeClass="active"
          onClick={closeMenu}
        >
          Features
        </ScrollLink>

        <ScrollLink
          to="technology"
          smooth={true}
          duration={600}
          offset={-80}
          spy={true}
          activeClass="active"
          onClick={closeMenu}
        >
          Technology
        </ScrollLink>

        <ScrollLink
          to="architecture"
          smooth={true}
          duration={600}
          offset={-80}
          spy={true}
          activeClass="active"
          onClick={closeMenu}
        >
          Architecture
        </ScrollLink>

        <ScrollLink
          to="contact"
          smooth={true}
          duration={600}
          offset={-80}
          spy={true}
          activeClass="active"
          onClick={closeMenu}
        >
          Contact
        </ScrollLink>
      </nav>

      <div className="nav-buttons">
        <Link to="/login" className="login-btn">
          Login
        </Link>

        <Link to="/register" className="register-btn">
          Register
        </Link>

        <button
          className="menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </header>
  );
}

export default Navbar;