import {
  loadMoxaSharedAssets,
  moxaAssetPath,
} from '../moxa-shared/moxa-shared.js';

const defaults = {
  backgroundImage: moxaAssetPath('images/MGate-G2_KV_1920x550-890d129f1d.jpg'),
  heading: 'Robust Security, Effortless Management',
  description: 'Easy and secure protocol conversion for modern OT networks',
  buttonText: 'Learn More',
  buttonLink: 'https://www.moxa.com/en/spotlight/protocol-gateways/mgate-g2/index',
};

function rowCell(row) {
  if (!row) return '';
  return row.children[0] || row;
}

function cellValue(row) {
  const cell = rowCell(row);
  if (!cell) return '';
  const image = cell.querySelector('img');
  if (image?.src) return image.src;
  const link = cell.querySelector('a');
  if (link?.href) return link.href;
  return cell.textContent.trim();
}

function buttonConfig(row) {
  const cell = rowCell(row);
  const link = cell?.querySelector('a');
  return {
    text: link?.textContent.trim() || cell?.textContent.trim() || defaults.buttonText,
    href: link?.href || defaults.buttonLink,
  };
}

function readConfig(block) {
  const rows = [...block.children];
  const button = buttonConfig(rows[3]);
  return {
    backgroundImage: cellValue(rows[0]) || defaults.backgroundImage,
    heading: cellValue(rows[1]) || defaults.heading,
    description: cellValue(rows[2]) || defaults.description,
    buttonText: button.text,
    buttonLink: button.href,
  };
}

function createBanner(config) {
  return document.createRange().createContextualFragment(`
    <div class="hero-carousel carousel-loaded">
      <div class="hero-carousel__slider slick-initialized slick-slider">
        <div class="slick-list draggable">
          <div class="slick-track">
            <div class="hero-carousel__slide slick-slide slick-current slick-active" data-slick-index="0" aria-hidden="false">
              <div class="hero-carousel__item -image" data-value="img">
                <div class="hero-carousel__img pic" style="background:url('${config.backgroundImage}') center center / cover no-repeat;">
                  <div class="container">
                    <div class="hero-carousel__container">
                      <h2 class="hero-carousel__heading"><b>${config.heading}</b></h2>
                      <p class="hero-carousel__paragraph">${config.description}</p>
                      <a class="border-btn border-btn--l border-btn--white" href="${config.buttonLink}">
                        <span class="fill-btn__text">${config.buttonText}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);
}

export default async function decorate(block) {
  await loadMoxaSharedAssets();
  const config = readConfig(block);
  block.replaceChildren(createBanner(config));
}
