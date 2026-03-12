import Splide from "@splidejs/splide";
import "@splidejs/splide/css";

const gallery = document.querySelector<HTMLElement>("[data-home-gallery]");

if (gallery) {
  new Splide(gallery, {
    type: "loop",
    perPage: 1,
    gap: "0",
    autoplay: true,
    interval: 5000,
    pauseOnHover: true,
    pauseOnFocus: true,
    resetProgress: false,
    arrows: true,
    pagination: true,
    speed: 500,
    drag: true,
  }).mount();
}
