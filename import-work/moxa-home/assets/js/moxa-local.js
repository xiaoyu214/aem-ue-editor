(() => {
  const duration = 1500;
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

  function setFinalValue(element, target) {
    element.textContent = String(target);
  }

  function animateNumber(element) {
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFinalValue(element, target);
      return;
    }

    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      element.textContent = String(Math.round(target * easeOutCubic(progress)));

      if (progress < 1) {
        requestAnimationFrame(step);
        return;
      }

      setFinalValue(element, target);
    };

    requestAnimationFrame(step);
  }

  function initGalaxyNumbers() {
    const numbers = [...document.querySelectorAll('.galaxy-section__number[data-count]')];
    if (!numbers.length) return;

    if (!('IntersectionObserver' in window)) {
      numbers.forEach(animateNumber);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animateNumber(entry.target);
      });
    }, { threshold: 0.25 });

    numbers.forEach((number) => observer.observe(number));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGalaxyNumbers, { once: true });
  } else {
    initGalaxyNumbers();
  }
})();
