// ToxicBro Shared Utilities
const SITE = {
  url: 'https://toxicbro.pages.dev',
  name: 'ToxicBro Official',
  channelId: 'UCXG8sste5hX3P26gWayrlkg',
  username: '@ToxicBroOfficial',
  email: 'contacttoxicbro@gmail.com'
};

// Loader removal
const finishLoad = () => document.documentElement.classList.remove('is-loading');
if (document.readyState === 'complete') finishLoad();
else { window.addEventListener('load', finishLoad, { once: true }); setTimeout(finishLoad, 3000); }

// Mobile menu
window.addEventListener('load', () => {
  const ham = document.getElementById('ham');
  const mob = document.getElementById('mob-menu');
  const close = document.getElementById('mob-close');
  if (!ham || !mob) return;
  
  const setOpen = (open) => {
    mob.classList.toggle('open', open);
    ham.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  };
  
  ham.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!mob.classList.contains('open')); });
  close?.addEventListener('click', () => setOpen(false));
  mob.addEventListener('click', (e) => { if (e.target === mob) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  mob.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
}, { once: true });

// Year updater
document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());

