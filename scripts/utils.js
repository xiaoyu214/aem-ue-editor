export const safeText = (el, fallback = "") =>
  el?.textContent?.trim() ?? fallback;

export function isAuthorEnvironment() {
  if (window?.location?.origin?.includes("author")) {
    return true;
  }
  return false;
}

export function whatBlockIsThis(element) {
  let currentElement = element;

  while (currentElement.parentElement) {
    if (currentElement.parentElement.classList.contains("block"))
      return currentElement.parentElement;
    currentElement = currentElement.parentElement;
    if (currentElement.classList.length > 0) return currentElement.classList[0];
  }
  return null;
}

/**
 * Moves all the attributes from a given elmenet to another given element virtual node.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function transferAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      if (to instanceof DocumentFragment) {
        to?.firstElementChild.setAttribute(attr, value);
      } else {
        to?.setAttribute(attr, value);
      }
      from.removeAttribute(attr);
    }
  });
}


/**
 * Move instrumentation attributes from a given element to another given element virtual node.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function transferInstrumentation(from, to) {
  transferAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter(
        (attr) =>
          attr.startsWith("data-aue-") || attr.startsWith("data-richtext-")
      )
  );
}
