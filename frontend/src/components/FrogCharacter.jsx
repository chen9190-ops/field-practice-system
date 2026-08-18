import React from "react";
import { frogDefault1 } from "../assets";

const frogs = {
  default: frogDefault1,
};

export function FrogCharacter({ pose = "default", className = "", alt = "青蛙角色" }) {
  return (
    <img
      className={`frog-character ${className}`.trim()}
      src={frogs[pose] ?? frogs.default}
      alt={alt}
      draggable="false"
    />
  );
}
