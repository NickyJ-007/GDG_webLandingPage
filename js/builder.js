/* ========================================================
   GDG UVCE WebStudio Interactive Engine
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
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

  const shipTopBtn = document.getElementById('ship-top-btn');
  const shipMainBtn = document.getElementById('ship-main-btn');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const directRegisterBtn = document.getElementById('direct-register-btn');
  const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');

  // Replace this placeholder once your seniors share the Google Form link
  const GOOGLE_FORM_LINK = "https://forms.gle/PASTE_GOOGLE_FORM_LINK_HERE";

  // Pull the actual workshop link from your repo's config if available, or fallback
  const workshopUrl = window.location.origin + window.location.pathname.replace('builder.html', 'index.html');
  
  // Set real registration link (replace with your actual Google Form / Bevy URL if ready)
  if (directRegisterBtn) {
  directRegisterBtn.href = GOOGLE_FORM_LINK;
  }

  // Pre-fill WhatsApp viral message
  const shareText = encodeURIComponent(
    `Hey! I just built and launched my first website on GDG UVCE WebStudio 🚀 Try building yours in 60 seconds and claim a seat for the online workshop:\n${workshopUrl}`
  );
  shareWhatsappBtn.href = `https://api.whatsapp.com/send?text=${shareText}`;
  const confettiCanvas = document.getElementById('confetti-canvas');

  // 1. Live Input Sync
  inputTitle.addEventListener('input', (e) => {
    const val = e.target.value.trim() || 'My Website';
    previewTitle.textContent = val;
    // Format mock URL
    const cleanSubdomain = val.toLowerCase().replace(/[^a-z0-9]/g, '');
    previewUrl.textContent = `https://${cleanSubdomain || 'my-site'}.gdguvce.dev`;
  });

  inputRole.addEventListener('input', (e) => {
    previewRole.textContent = e.target.value || 'Engineer · Developer';
  });

  inputBio.addEventListener('input', (e) => {
    previewBio.textContent = e.target.value || 'Building websites with GDG UVCE!';
  });

  inputBtnText.addEventListener('input', (e) => {
    previewButton.textContent = e.target.value || 'Click Me ›';
  });

  // 2. Theme Selection
  themeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      themeChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      const theme = chip.getAttribute('data-theme');
      previewContent.className = `browser-content ${theme}`;
    });
  });

  // 3. Sticker Selection
  stickerChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      stickerChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      const emoji = chip.getAttribute('data-emoji');
      previewSticker.textContent = emoji;
    });
  });

  // 4. Modal Open & Trigger Confetti
  const openShipModal = () => {
    modalBackdrop.classList.add('open');
    runConfetti();
  };

  shipTopBtn.addEventListener('click', openShipModal);
  shipMainBtn.addEventListener('click', openShipModal);

  closeModalBtn.addEventListener('click', () => {
    modalBackdrop.classList.remove('open');
  });

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      modalBackdrop.classList.remove('open');
    }
  });

  // 5. Lightweight Pure JS Canvas Confetti (100% offline, 0 dependencies)
  function runConfetti() {
    const ctx = confettiCanvas.getContext('2d');
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
});