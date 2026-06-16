import { isAuthorEnvironment, safeText } from "../../scripts/utils.js";
import { transferInstrumentation } from "../../scripts/utils.js";

const withAuthorTestRef = (url) => {
  if (!window.location.hostname.endsWith('.adobeaemcloud.com') || /[?&]ref=/.test(url)) return url;
  // Temporary workaround: author CDN can serve stale static resources without an explicit ref.
  // Force ref=main for testing until CDN/config behavior is resolved.
  return `${url}${url.includes('?') ? '&' : '?'}ref=main`;
};

const itemsStartIndex = 3;
export default async function decorate(block) {
  const divs = block.children;
  const title = divs[0].textContent.trim() || "Our Advantages";
  const itemCount = Number(divs[1].textContent.trim()) || 3;
  const imageAutoplayDuration = Number(divs[2].textContent.trim()) || 5;
  const mockupContainer = document.createRange()
    .createContextualFragment(`<div class='container'>
    <div class="carousel panelcontainer">
      <div class="section-heading content-center">
        <h2>${title}</h2>
      </div>
      <div
        class="cmp-carousel"
        role="group"
        aria-live="polite"
        aria-roledescription="carousel"
        data-cmp-is="carousel"
        data-cmp-delay="${imageAutoplayDuration*1000}"
        data-carousel-effect="creative"
        data-prev-slide-message="Previous advantage" 
        data-next-slide-message="Next advantage"
      >
        <div class="cmp-carousel__content">
        </div>

        <div class="cmp-carousel__actions">
          <button class="cmp-carousel__action cmp-carousel__action--previous" type="button" aria-label="Previous">
            <span class="visually-hidden"></span>
          </button>
          <button class="cmp-carousel__action cmp-carousel__action--next" type="button" aria-label="Next">
            <span class="visually-hidden"></span>
          </button>
        </div>

        <ol class="cmp-carousel__indicators" role="tablist" aria-label="Choose a slide to display"></ol>
      </div>
    </div>
  </div>`);

  const cardNodes = [];
  [...block.children].forEach((card, i) => {
    if (i > itemsStartIndex + itemCount - 1 || i < itemsStartIndex) return;
    const divs = card.querySelectorAll("div");
    const headline = safeText(divs.item(1));
    const details = safeText(divs.item(2));
    const navigate = safeText(divs.item(3));
    const mediaHTML = card.querySelector("picture")?.innerHTML ?? "";

    const mockup = document.createRange().createContextualFragment(`
          <div class="cmp-carousel__item">
            <div class="cmp-advantage-card">
              <div class="cmp-advantage-card__image-wrapper">
                ${mediaHTML}
                <video class="cmp-advantage-card__video" playsinline controls>
                  <source
                    type="video/mp4">
                  Your browser does not support the video tag.
                </video>
              </div>
              <div class="cmp-advantage-card__overlay">
                <div class="cmp-advantage-card__content">
                  <h3 class="cmp-advantage-card__title">${headline}</h3>
                  <p class="cmp-advantage-card__desc">
                    ${details}
                  </p>
                  <button class="cmp-advantage-card__btn btn">${navigate}<img
                  alt="play-icon" src="/content/dam/eds-enablement-xwalk/asus-cto-sites/icon-play-filled.svg" /></button>
                </div>
              </div>
            </div>
          </div>`);

    if (isAuthorEnvironment()) {
      transferInstrumentation(card, mockup);
    }
    cardNodes.push(mockup);
  });

  mockupContainer.querySelector(".cmp-carousel__content").append(...cardNodes);

  //move attr
  if (isAuthorEnvironment()) {
    //move title
    if (block.firstElementChild) {
      transferInstrumentation(
        block.firstElementChild,
        mockupContainer.querySelector(".section-heading")
      );
    }
  }

  block.innerHTML = "";
  block.append(mockupContainer);

  // trigger block
  await import(withAuthorTestRef('../../scripts/carousel.js'));
  await import(withAuthorTestRef('./uifrontend_advantage-card.js'));

  if (window.initializeSwiperOnAEMCarousel) {
    window.initializeSwiperOnAEMCarousel(block.querySelector(".container"));
  }
}
