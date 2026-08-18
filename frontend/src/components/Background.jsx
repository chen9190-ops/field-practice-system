import React from "react";
import { bgMain } from "../assets";

export function Background() {
  return (
    <>
      <div
        className="home-background-blur"
        style={{ backgroundImage: `url(${bgMain})` }}
        aria-hidden="true"
      />
      <img
        src={bgMain}
        className="home-background-main"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
    </>
  );
}
