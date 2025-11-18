import { transferInstrumentation } from "../../scripts/utils.js";
import { isAuthorEnvironment } from "../../scripts/utils.js";
export default async function decorate(block) {
  const divs = block.children;
  const mockupContainer = document.createElement("div"); // 真实DOM容器

  //move attr
  if (isAuthorEnvironment()) {
    transferInstrumentation(block, mockupContainer);

    if (divs[0]) {
      const headline = document.createElement("h2");
      headline.className = "section-heading__title";
      headline.textContent = divs[0].textContent.trim();
      mockupContainer.appendChild(headline);
      transferInstrumentation(divs[0], headline);
    }
  }

  block.replaceWith(mockupContainer);
}
