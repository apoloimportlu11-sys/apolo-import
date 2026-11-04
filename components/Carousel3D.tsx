import React from "react";
import styled from "styled-components";
import Image from "next/image";
import ModelViewer3D from "./ModelViewer3D";
import { CarouselItemData } from "@/lib/carousel-items";

export interface CarouselItem {
  content?: React.ReactNode;
  url?: string;
  name?: string;
  format?: "png" | "gltf" | "glb";
  color?: string; // "255, 193, 7"
}

interface Carousel3DProps {
  items: (CarouselItem | CarouselItemData)[];
}

const StyledWrapper = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1200px;
  overflow: visible;

  .wrapper {
    overflow: visible;
    position: relative;
    width: 100%;
    max-width: 820px;
    min-height: 260px;
    padding: 20px 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .inner {
    --w: clamp(140px, 32vw, 220px);
    --h: clamp(190px, 42vw, 290px);
    --translateZ: calc((var(--w) + var(--h)) * 0.58);
    --rotateX: -10deg;

    position: absolute;
    width: var(--w);
    height: var(--h);
    transform-style: preserve-3d;
    will-change: transform;
    animation: spin 18s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotateX(var(--rotateX)) rotateY(0deg);
    }
    to {
      transform: rotateX(var(--rotateX)) rotateY(360deg);
    }
  }

  .card {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    will-change: transform;
    transform:
      rotateY(calc((360deg / var(--quantity)) * var(--index)))
      translateZ(var(--translateZ));
  }

  /* ---------- PREMIUM CARD (LIGHT & DARK DYNAMIC) ---------- */
  .card_box {
    width: 100%;
    height: 100%;
    border-radius: 22px;
    position: relative;
    overflow: visible;
    z-index: 2;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;

    /* Cristal adaptativo en modo claro */
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    border: 1px solid rgba(220, 38, 38, 0.35);

    box-shadow:
      0 15px 35px rgba(0, 0, 0, 0.08),
      0 0 25px rgba(220, 38, 38, 0.15);

    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.45s ease;
  }

  :is(.dark, [data-theme='dark']) .card_box {
    /* Cristal en modo oscuro */
    background: linear-gradient(
      135deg,
      rgba(28, 28, 32, 0.92),
      rgba(14, 14, 18, 0.85)
    );
    border: 1px solid rgba(220, 38, 38, 0.5);
    box-shadow:
      0 25px 60px rgba(0, 0, 0, 0.75),
      0 0 35px rgba(220, 38, 38, 0.5),
      0 0 110px rgba(220, 38, 38, 0.25);
  }

  /* halo energético */
  .card_box::before {
    content: "";
    position: absolute;
    inset: 2px;
    border-radius: inherit;
    background: linear-gradient(
      120deg,
      rgba(220, 38, 38, 0.85),
      rgba(0, 0, 0, 0.2),
      rgba(239, 68, 68, 0.85)
    );
    opacity: 0.35;
    z-index: -1;
    filter: blur(12px);
  }

  :is(.dark, [data-theme='dark']) .card_box::before {
    background: linear-gradient(
      120deg,
      rgba(220, 38, 38, 0.85),
      rgba(0, 0, 0, 0.9),
      rgba(239, 68, 68, 0.85)
    );
    opacity: 0.45;
  }

  /* reflejo cristal */
  .card_box::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      115deg,
      transparent 20%,
      rgba(255, 255, 255, 0.25) 45%,
      transparent 65%
    );
    opacity: 0.6;
    pointer-events: none;
  }

  /* hover */
  .card_box:hover {
    transform: scale(0.96);
    box-shadow:
      0 20px 45px rgba(0, 0, 0, 0.12),
      0 0 50px rgba(239, 68, 68, 0.4);
  }

  :is(.dark, [data-theme='dark']) .card_box:hover {
    box-shadow:
      0 35px 90px rgba(0, 0, 0, 0.9),
      0 0 70px rgba(239, 68, 68, 0.8),
      0 0 180px rgba(220, 38, 38, 0.45);
  }

  /* sombra flotante */
  .card::after {
    content: "";
    position: absolute;
    inset: 30% 12%;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 0, 0, 0.6),
      transparent 70%
    );
    transform: translateZ(-40px);
    filter: blur(20px);
  }

  /* ---------- RIBBON PREMIUM ---------- */
  .card_box span {
    position: absolute;
    overflow: hidden;
    z-index: 20;
    width: 140px;
    height: 140px;
    top: -10px;
    left: -10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card_box span::before {
    content: "Premium";
    position: absolute;
    z-index: 21;
    width: 150%;
    height: 36px;
    background-image: linear-gradient(
      45deg,
      #ff6547 0%,
      #ffb144 51%,
      #ff7053 100%
    );
    transform: rotate(-45deg) translateY(-18px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.35);
  }

  .card_box span::after {
    content: "";
    position: absolute;
    width: 10px;
    z-index: 19;
    bottom: 0;
    left: 0;
    height: 10px;
    box-shadow: 130px -130px #cc3f47;
    background-image: linear-gradient(
      45deg,
      #ff512f 0%,
      #f09819 51%,
      #ff512f 100%
    );
  }

  .content {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
  }

  /* Mobile ajustes */
  @media (max-width: 480px) {
    .wrapper {
      min-height: 260px;
      padding: 20px 0;
    }
  }
`;

const Carousel3D: React.FC<Carousel3DProps> = ({ items }) => {
  return (
    <StyledWrapper>
      <div className="wrapper">
        <div
          className="inner"
          style={{ "--quantity": items.length } as React.CSSProperties}
        >
          {items.map((item, i) => {
            const isModel3D =
              ("format" in item && (item.format === "glb" || item.format === "gltf")) ||
              (item.url && (item.url.toLowerCase().split("?")[0].endsWith(".glb") || item.url.toLowerCase().split("?")[0].endsWith(".gltf")));

            const renderContent = () => {
              if ("content" in item && item.content) {
                return item.content;
              }
              if (isModel3D && item.url) {
                return <ModelViewer3D src={item.url} alt={item.name || `Modelo 3D ${i + 1}`} />;
              }
              if (item.url) {
                return (
                  <div className="relative w-full h-full">
                    <Image
                      src={item.url}
                      alt={item.name || `Producto ${i + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                );
              }
              return null;
            };

            return (
              <div
                key={"id" in item && item.id ? item.id : i}
                className="card"
                style={
                  {
                    "--index": i,
                  } as React.CSSProperties
                }
              >
                <div className="card_box">
                  <span />
                  <div className="content">{renderContent()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Carousel3D;
