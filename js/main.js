(function () {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------------------------- CTA links from config -------------------- */
  document.querySelectorAll(".js-whatsapp-btn").forEach((el) => {
    el.href = SITE_CONFIG.WHATSAPP_LINK;
  });
  document.querySelectorAll(".js-register-btn").forEach((el) => {
    el.href = SITE_CONFIG.REGISTRATION_LINK;
  });

  /* ---------------------------- Countdown with flip -------------------- */
  const workshopDate = new Date(SITE_CONFIG.WORKSHOP_DATE).getTime();
  const elDays = document.getElementById("cd-days");
  const elHours = document.getElementById("cd-hours");
  const elMins = document.getElementById("cd-mins");
  const elSecs = document.getElementById("cd-secs");

  function pad(n) {
    return String(Math.max(n, 0)).padStart(2, "0");
  }

  function setDigit(el, value) {
    if (el.textContent === value) return;
    if (prefersReducedMotion) {
      el.textContent = value;
      return;
    }
    el.classList.add("flipping");
    setTimeout(() => {
      el.textContent = value;
    }, 250);
    setTimeout(() => {
      el.classList.remove("flipping");
    }, 500);
  }

  function updateCountdown() {
    const now = Date.now();
    const diff = workshopDate - now;

    if (diff <= 0) {
      setDigit(elDays, "00");
      setDigit(elHours, "00");
      setDigit(elMins, "00");
      setDigit(elSecs, "00");
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    setDigit(elDays, pad(days));
    setDigit(elHours, pad(hours));
    setDigit(elMins, pad(mins));
    setDigit(elSecs, pad(secs));
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ---------------------------- Hero event metadata ------------------------ */
  const heroDateEl = document.getElementById("hero-date");
  if (heroDateEl && SITE_CONFIG.WORKSHOP_DATE) {
    heroDateEl.textContent = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(SITE_CONFIG.WORKSHOP_DATE));
  }

  const heroTimeEl = document.getElementById("hero-time");
  if (heroTimeEl && SITE_CONFIG.WORKSHOP_TIME) {
    heroTimeEl.textContent = SITE_CONFIG.WORKSHOP_TIME;
  }

  const heroVenueEl = document.getElementById("hero-venue");
  if (heroVenueEl && SITE_CONFIG.VENUE) {
    heroVenueEl.textContent = SITE_CONFIG.VENUE;
  }

  /* ---------------------------- Typewriter headline ----------------------- */
  const words = ["HTML", "CSS", "JavaScript", "Deployment"];
  const typewriterEl = document.getElementById("typewriter");

  if (prefersReducedMotion) {
    typewriterEl.textContent = words.join(" · ");
  } else {
    let wordIndex = 0;
    let charIndex = 0;
    let typing = true;
    let pauseUntil = 0;

    function typeLoop(now) {
      if (now < pauseUntil) {
        requestAnimationFrame(typeLoop);
        return;
      }
      const word = words[wordIndex];

      if (typing) {
        charIndex++;
        typewriterEl.textContent = word.slice(0, charIndex);
        if (charIndex >= word.length) {
          typing = false;
          pauseUntil = now + 1100;
        }
      } else {
        charIndex--;
        typewriterEl.textContent = word.slice(0, charIndex);
        if (charIndex <= 0) {
          typing = true;
          wordIndex = (wordIndex + 1) % words.length;
          pauseUntil = now + 250;
        }
      }

      const delay = typing ? 90 : 55;
      pauseUntil = Math.max(pauseUntil, now + delay);
      requestAnimationFrame(typeLoop);
    }
    requestAnimationFrame(typeLoop);
  }

  /* ---------------------------- Speakers --------------------------------- */
  const speakerGrid = document.getElementById("speaker-grid");
  if (speakerGrid && Array.isArray(SPEAKERS)) {
    speakerGrid.innerHTML = "";
    SPEAKERS.forEach((speaker, i) => {
      const card = document.createElement("div");
      const colorModifier = speaker.color ? `speaker-card--${speaker.color}` : "";
      card.className = `window-card speaker-card ${colorModifier} reveal`;
      card.style.transitionDelay = `${i * 90}ms`;

      const objPos = speaker.objectPosition || "center 20%";
      const altText = speaker.alt || `${speaker.name}, speaker for ${speaker.topic}`;
      const tagText = `speaker_0${i + 1}`;

      let mediaHTML;
      if (speaker.photo) {
        mediaHTML = `
          <div class="speaker-photo-frame speaker-photo-frame--${speaker.color}">
            <img
              class="speaker-photo"
              src="${speaker.photo}"
              alt="${altText}"
              style="object-position: ${objPos};"
              loading="lazy"
              onerror="this.parentElement.innerHTML='<div class=&quot;speaker-placeholder&quot;>${speaker.name.slice(0, 2).toUpperCase()}</div>'"
            />
          </div>
        `;
      } else {
        const initials = speaker.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        mediaHTML = `
          <div class="speaker-photo-frame speaker-photo-frame--${speaker.color}">
            <div class="speaker-placeholder" aria-hidden="true">${initials}</div>
          </div>
        `;
      }

      const speakerBadgeMeta = `${speaker.branch} · ${speaker.semester}`;

      card.innerHTML = `
        <div class="card-window-header">
          <div class="window-controls" aria-hidden="true">
            <span class="window-dot window-dot--red"></span>
            <span class="window-dot window-dot--yellow"></span>
            <span class="window-dot window-dot--green"></span>
          </div>
          <span class="card-window-tag">${tagText}</span>
        </div>
        <div class="speaker-card__body">
          <div class="speaker-card__portrait-col">
            ${mediaHTML}
          </div>
          <div class="speaker-card__content-col">
            <div class="speaker-card__desc-panel">
              <p class="speaker-card__desc-text">${speaker.description}</p>
            </div>
            <div class="speaker-card__identity-panel">
              <div class="speaker-card__identity-main">
                <h3 class="speaker-name">${speaker.name}</h3>
                <span class="speaker-academic-meta">${speakerBadgeMeta}</span>
              </div>
              <div class="speaker-topic-wrapper">
                <span class="code-pill code-pill--${speaker.color} speaker-topic-pill">${speaker.topic}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="card-window-footer">
          <span class="card-window-chapter">GDG UVCE</span>
          <span class="card-window-track">${speaker.topic.toUpperCase()}</span>
        </div>
      `;
      speakerGrid.appendChild(card);
    });
  }

  /* ---------------------------- About ------------------------------------- */
  document.getElementById("about-text").textContent = ABOUT_TEXT;

  /* ---------------------------- Scroll-triggered reveals ------------------ */
  const revealTargets = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------------------------- Sticky nav on scroll ----------------------- */
  const siteNav = document.getElementById("site-nav");
  const heroSection = document.getElementById("hero");
  if (siteNav && heroSection && "IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          siteNav.classList.toggle("is-visible", !entry.isIntersecting);
        });
      },
      { rootMargin: "-80% 0px 0px 0px" }
    );
    navObserver.observe(heroSection);
  }
})();
