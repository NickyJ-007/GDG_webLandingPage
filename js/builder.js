/* ========================================================
   GDG UVCE WebStudio Interactive Engine
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Elements
  const inputTitle = document.getElementById('input-title');
  const inputRole = document.getElementById('input-role');
  const inputBio = document.getElementById('input-bio');
  const inputBtnText = document.getElementById('input-btn-text');

  const previewTitle = document.getElementById('preview-title');
  const previewRole = document.getElementById('preview-role');
  const previewBio = document.getElementById('preview-bio');
  const previewButton = document.getElementById('preview-button');
  const previewSticker = document.getElementById('preview-sticker');
  const previewUrl = document.getElementById('preview-url');
  const previewContent = document.getElementById('preview-content');

  const themeChips = document.querySelectorAll('.theme-chip');
  const stickerChips = document.querySelectorAll('.sticker-chip');

  const modalBackdrop = document.getElementById('modal-backdrop');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const directRegisterBtn = document.getElementById('direct-register-btn');
  const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
  const confettiCanvas = document.getElementById('confetti-canvas');

  const studioContainer = document.querySelector('.studio-container');
  const tabEditBtn = document.getElementById('tab-edit-btn');
  const tabPrevBtn = document.getElementById('tab-prev-btn');
  const controlPanel = document.querySelector('.control-panel');
  const previewPanel = document.querySelector('.preview-panel');

  // 2. Live Input Sync
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
    if (previewButton) previewButton.textContent = e.target.value || 'Explore My Projects ›';
  });

  // 3. Theme Selection
  themeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      themeChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const theme = chip.getAttribute('data-theme');
      if (previewContent && theme) {
        previewContent.className = `browser-content ${theme}`;
      }
    });
  });

  // 4. Mascot / Sticker Selection
  stickerChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      stickerChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const emoji = chip.getAttribute('data-emoji');
      if (previewSticker && emoji) {
        previewSticker.textContent = emoji;
      }
    });
  });

// 5. Modal Open & Close Logic (Scroll-Safe)
  const openShipModal = () => {
    if (modalBackdrop) {
      modalBackdrop.classList.add('open');
      modalBackdrop.scrollTop = 0;              // Scrolls popup to the very top upon opening
      document.body.style.overflow = 'hidden';  // Freezes background page so it cannot drag
      runConfetti();
    }
  };

  const closeShipModal = () => {
    if (modalBackdrop) {
      modalBackdrop.classList.remove('open');
      document.body.style.overflow = '';        // Restores normal background page scrolling
    }
  };

  // Attach click listener to all ship buttons
  const shipButtons = document.querySelectorAll(
    '#ship-website-btn, #ship-top-btn, #ship-main-btn, .ship-btn, .nav-ship-btn, .ship-btn-main'
  );
  shipButtons.forEach((btn) => {
    btn.addEventListener('click', openShipModal);
  });

  closeModalBtn?.addEventListener('click', closeShipModal);

  modalBackdrop?.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closeShipModal();
    }
  });

  // 6. Safe Link Setup
  const GOOGLE_FORM_LINK = "https://forms.gle/PASTE_GOOGLE_FORM_LINK_HERE";
  if (directRegisterBtn) {
    directRegisterBtn.href = GOOGLE_FORM_LINK;
  }

  if (shareWhatsappBtn) {
    const workshopUrl = window.location.origin + window.location.pathname.replace('builder.html', 'index.html');
    const shareText = encodeURIComponent(
      `Hey! I just built and launched my first website on GDG UVCE WebStudio 🚀 Try building yours in 60 seconds and claim a seat for the online workshop:\n${workshopUrl}`
    );
    shareWhatsappBtn.href = `https://api.whatsapp.com/send?text=${shareText}`;
  }

  // 7. Confetti Effect
  function runConfetti() {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext('2d');
    if (!ctx) return;

    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#4285F4', '#34A853', '#F9AB00', '#EA4335', '#FBBC04'];

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

// 8. Mobile View Switcher
  function showCustomize() {
    tabEditBtn?.classList.add('active');
    tabPrevBtn?.classList.remove('active');
    document.body.classList.remove('show-preview');
    studioContainer?.classList.remove('view-preview');

    if (window.innerWidth <= 768) {
      if (controlPanel) controlPanel.style.display = 'block';
      if (previewPanel) previewPanel.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function showLivePreview() {
    tabPrevBtn?.classList.add('active');
    tabEditBtn?.classList.remove('active');
    document.body.classList.add('show-preview');
    studioContainer?.classList.add('view-preview');

    if (window.innerWidth <= 768) {
      if (controlPanel) controlPanel.style.display = 'none';
      if (previewPanel) previewPanel.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  tabEditBtn?.addEventListener('click', showCustomize);
  tabPrevBtn?.addEventListener('click', showLivePreview);

  if (window.innerWidth <= 768) {
    showCustomize();
  }
});