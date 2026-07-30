// src/pages/Landing.jsx

import Navbar from "../components/layout/Navbar";
import Hero from "../components/layout/Hero";
import Features from "../components/layout/Features";
import Technology from "../components/layout/Technology";
import Architecture from "../components/layout/Architecture";
import CTA from "../components/layout/CTA";
import Footer from "../components/layout/Footer";

import "./Landing.css";

function Landing() {
  return (
    <>
      <Navbar />

      <main>

        <section id="home">
          <Hero />
        </section>

        <section id="features">
          <Features />
        </section>

        <section id="technology">
          <Technology />
        </section>

        <section id="architecture">
          <Architecture />
        </section>

        <section id="contact">
          <CTA />
        </section>

      </main>

      <Footer />
    </>
  );
}

export default Landing;