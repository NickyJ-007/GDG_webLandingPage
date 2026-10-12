/* ========================================================
   GDG UVCE WebStudio Interactive Engine
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Elements
  const inputTitle = document.getElementById('input-title');
  const inputRole = document.getElementById('input-role');
  const inputBio = document.getElementById('input-bio');
  const inputBtnText = document.getElementById('input-btn-text');
  const inputBtnUrl = document.getElementById('input-btn-url');

  const previewTitle = document.getElementById('preview-title');
  const previewRole = document.getElementById('preview-role');
  const previewBio = document.getElementById('preview-bio');
  const previewButton = document.getElementById('preview-button');
  const previewSticker = document.getElementById('preview-sticker');
  const previewUrl = document.getElementById('preview-url');
  const previewContent = document.getElementById('preview-content');
  const previewToast = document.getElementById('preview-toast');

  // 2. Celebration Modal (Guaranteed Event Listeners)
  const modalBackdrop = document.getElementById('modal-backdrop');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const confettiCanvas = document.getElementById('confetti-canvas');
  const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
  const directRegisterBtn = document.getElementById('direct-register-btn');

  function openShipModal() {
    if (modalBackdrop) {
      modalBackdrop.classList.add('open');
      modalBackdrop.scrollTop = 0;
      document.body.style.overflow = 'hidden';
      runConfetti();
    }
  }

  function closeShipModal() {
    if (modalBackdrop) {
      modalBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // Universal click capture for any Ship button (blue header button OR bottom green button)
  document.addEventListener('click', (e) => {
    const target = e.target.closest(
      '#ship-website-btn, #ship-main-btn, .nav-ship-btn, .ship-main-btn, .ship-btn'
    );
    if (target) {
      e.preventDefault();
      openShipModal();
    }
  });

  closeModalBtn?.addEventListener('click', closeShipModal);
  modalBackdrop?.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeShipModal();
  });

  // 3. Live Form Input Sync
  inputTitle?.addEventListener('input', (e) => {
    const val = e.target.value.trim() || "Alex's Portfolio";
    if (previewTitle) previewTitle.textContent = val;
    if (previewUrl) {
      const cleanSubdomain = val.toLowerCase().replace(/[^a-z0-9]/g, '');
      previewUrl.textContent = `https://${cleanSubdomain || 'my-site'}.gdguvce.dev`;
    }
  });

  inputRole?.addEventListener('input', (e) => {
    if (previewRole) previewRole.textContent = e.target.value || 'First-Year Engineer · Aspiring Developer';
  });

  inputBio?.addEventListener('input', (e) => {
    if (previewBio) previewBio.textContent = e.target.value || 'Building modern web projects from scratch. Excited to learn full-stack development at GDG UVCE!';
  });

  inputBtnText?.addEventListener('input', (e) => {
    if (previewButton) previewButton.textContent = e.target.value || 'Say Hello on Instagram 👋';
  });

  // 4. Interactive Toast on CTA Button Click
  let toastTimer = null;
  function showToast(msg) {
    if (!previewToast) return;
    previewToast.textContent = msg;
    previewToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      previewToast.classList.remove('show');
    }, 2800);
  }

  previewButton?.addEventListener('click', (e) => {
    e.preventDefault();
    let url = inputBtnUrl?.value.trim() || '';

    if (url) {
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      showToast('🚀 Opening your link in a new tab!');
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      showToast('💡 In real web development, this button opens your social profile or portfolio!');
    }
  });

  // 5. Theme Palette Chips
  const themeChips = document.querySelectorAll('.theme-chip');
  themeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      themeChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const theme = chip.getAttribute('data-theme') || 'theme-blue';
      if (previewContent) {
        previewContent.className = `browser-content ${theme}`;
      }
    });
  });

  // 6. Sticker / Mascot Chips
  const stickerChips = document.querySelectorAll('.sticker-chip');
  stickerChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      stickerChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const emoji = chip.getAttribute('data-emoji');
      if (previewSticker && emoji) previewSticker.textContent = emoji;
    });
  });

  // 7. Tech Interest Badges
  const previewSkillsList = document.getElementById('preview-skills-list');
  function renderSkillBadges() {
    if (!previewSkillsList) return;
    previewSkillsList.innerHTML = '';
    const activeChips = document.querySelectorAll('.skill-chip.active');
    activeChips.forEach((chip) => {
      const badge = document.createElement('span');
      badge.className = 'preview-skill-tag';
      badge.textContent = chip.getAttribute('data-skill');
      previewSkillsList.appendChild(badge);
    });
  }

  const skillChips = document.querySelectorAll('.skill-chip');
  skillChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      renderSkillBadges();
    });
  });
  renderSkillBadges();

  // 8. Safe WhatsApp Share Links
  if (shareWhatsappBtn) {
    const workshopUrl = window.location.href.includes('builder.html')
      ? window.location.href.replace('builder.html', 'index.html')
      : (window.location.origin + window.location.pathname.replace(/\/$/, '') + '/index.html');

    const shareText = encodeURIComponent(
      `Hey! I just built and launched my first website on GDG UVCE WebStudio 🚀 Try building yours in 60 seconds and claim a seat for the online workshop:\n${workshopUrl}`
    );
    shareWhatsappBtn.href = `https://wa.me/?text=${shareText}`;
    shareWhatsappBtn.target = "_blank";
    shareWhatsappBtn.rel = "noopener noreferrer";
  }

  // 9. Confetti Particle Animation
  function runConfetti() {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext('2d');
    if (!ctx) return;

    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#4285F4', '#34A853', '#FBBC04', '#EA4335'];

    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: Math.random() * confettiCanvas.width,
        y: Math.random() * confettiCanvas.height - confettiCanvas.height,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * 360,
        spin: Math.random() * 8 - 4
      });
    }

    let frames = 0;
    function update() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      pieces.forEach((p) => {
        p.y += p.speed;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      frames++;
      if (frames < 140) {
        requestAnimationFrame(update);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }
    update();
  }

  // 10. Mobile Tab Switcher
  const tabEditBtn = document.getElementById('tab-edit-btn');
  const tabPrevBtn = document.getElementById('tab-prev-btn');

  tabEditBtn?.addEventListener('click', () => {
    tabEditBtn.classList.add('active');
    tabPrevBtn?.classList.remove('active');
    document.body.classList.remove('show-preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  tabPrevBtn?.addEventListener('click', () => {
    tabPrevBtn.classList.add('active');
    tabEditBtn?.classList.remove('active');
    document.body.classList.add('show-preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});