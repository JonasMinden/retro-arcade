const STORAGE_KEY = "retro_arcade_language_v1";

const languages = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

const strings = {
  de: { navHome: "Start", navAccount: "Account", navContact: "Kontakt", navLegal: "Impressum", navPrivacy: "Datenschutz", cookieTitle: "Deine Auswahl für Cookies und ähnliche Speicherungen", cookieBody: "Notwendige Cookies sind für Login und sichere Sessions aktiv. Analyse und Marketing bleiben aus, bis du sie erlaubst.", cookieNecessary: "Notwendig", cookieNecessaryBody: "Erforderlich für Sessions, Login und grundlegende Funktionen.", cookieAnalytics: "Analyse", cookieAnalyticsBody: "Für spätere Reichweitenmessung und Nutzungsstatistiken.", cookieMarketing: "Marketing", cookieMarketingBody: "Für spätere Werbeeinbindung und personalisierte Ad-Auslieferung.", cookieOnlyNecessary: "Nur notwendige", cookieSave: "Auswahl speichern", cookieAll: "Alle akzeptieren", accountLink: "Account", loginRequired: "Bitte erst optional einloggen, um Scores zu speichern.", playRound: "Spiele erst eine Runde mit gültigem Score.", scoreSaved: "Score gespeichert.", registerOk: "Registriert als {username}.", loginOk: "Eingeloggt als {username}.", contactSent: "Nachricht erfolgreich versendet.", contactStored: "Anfrage gespeichert. E-Mail-Versand ist noch nicht vollständig konfiguriert." },
  en: { navHome: "Home", navAccount: "Account", navContact: "Contact", navLegal: "Legal notice", navPrivacy: "Privacy", cookieTitle: "Your choice for cookies and similar storage", cookieBody: "Necessary cookies stay active for login and secure sessions. Analytics and marketing remain off until you allow them.", cookieNecessary: "Necessary", cookieNecessaryBody: "Required for sessions, login and core functionality.", cookieAnalytics: "Analytics", cookieAnalyticsBody: "For future traffic measurement and usage statistics.", cookieMarketing: "Marketing", cookieMarketingBody: "For future ads and personalized ad delivery.", cookieOnlyNecessary: "Necessary only", cookieSave: "Save selection", cookieAll: "Accept all", accountLink: "Account", loginRequired: "Please sign in first if you want to save scores.", playRound: "Play a round first with a valid score.", scoreSaved: "Score saved.", registerOk: "Registered as {username}.", loginOk: "Signed in as {username}.", contactSent: "Message sent successfully.", contactStored: "Your message was saved. Email delivery is not fully configured yet." },
  es: { navHome: "Inicio", navAccount: "Cuenta", navContact: "Contacto", navLegal: "Aviso legal", navPrivacy: "Privacidad", cookieTitle: "Tu elección para cookies y almacenamientos similares", cookieBody: "Las cookies necesarias permanecen activas para el inicio de sesión y las sesiones seguras. El análisis y el marketing permanecen desactivados hasta que los permitas.", cookieNecessary: "Necesarias", cookieNecessaryBody: "Necesarias para sesiones, inicio de sesión y funciones básicas.", cookieAnalytics: "Analítica", cookieAnalyticsBody: "Para futuras estadísticas de uso y medición de tráfico.", cookieMarketing: "Marketing", cookieMarketingBody: "Para futuros anuncios y publicidad personalizada.", cookieOnlyNecessary: "Solo necesarias", cookieSave: "Guardar selección", cookieAll: "Aceptar todo", accountLink: "Cuenta", loginRequired: "Inicia sesión primero si quieres guardar puntuaciones.", playRound: "Juega primero una partida con una puntuación válida.", scoreSaved: "Puntuación guardada.", registerOk: "Registrado como {username}.", loginOk: "Sesión iniciada como {username}.", contactSent: "Mensaje enviado correctamente.", contactStored: "Tu mensaje se guardó. El envío por correo todavía no está completamente configurado." },
  fr: { navHome: "Accueil", navAccount: "Compte", navContact: "Contact", navLegal: "Mentions légales", navPrivacy: "Confidentialité", cookieTitle: "Votre choix pour les cookies et stockages similaires", cookieBody: "Les cookies nécessaires restent actifs pour la connexion et les sessions sécurisées. L'analyse et le marketing restent désactivés jusqu'à votre autorisation.", cookieNecessary: "Nécessaires", cookieNecessaryBody: "Nécessaires pour les sessions, la connexion et les fonctions de base.", cookieAnalytics: "Analyse", cookieAnalyticsBody: "Pour de futures statistiques d'utilisation et de trafic.", cookieMarketing: "Marketing", cookieMarketingBody: "Pour de futures publicités et une diffusion personnalisée.", cookieOnlyNecessary: "Nécessaires seulement", cookieSave: "Enregistrer", cookieAll: "Tout accepter", accountLink: "Compte", loginRequired: "Connecte-toi d'abord si tu veux enregistrer des scores.", playRound: "Joue d'abord une partie avec un score valide.", scoreSaved: "Score enregistré.", registerOk: "Inscrit en tant que {username}.", loginOk: "Connecté en tant que {username}.", contactSent: "Message envoyé avec succès.", contactStored: "Ton message a été enregistré. L'envoi d'e-mail n'est pas encore entièrement configuré." },
  zh: { navHome: "首页", navAccount: "账户", navContact: "联系", navLegal: "法律声明", navPrivacy: "隐私", cookieTitle: "你的 Cookie 与类似存储选择", cookieBody: "登录和安全会话所需的必要 Cookie 会保持启用。分析和营销在你允许之前保持关闭。", cookieNecessary: "必要", cookieNecessaryBody: "用于会话、登录和基础功能。", cookieAnalytics: "分析", cookieAnalyticsBody: "用于未来的流量统计和使用分析。", cookieMarketing: "营销", cookieMarketingBody: "用于未来广告和个性化投放。", cookieOnlyNecessary: "仅必要", cookieSave: "保存选择", cookieAll: "全部接受", accountLink: "账户", loginRequired: "如需保存分数，请先登录。", playRound: "请先完成一局并获得有效分数。", scoreSaved: "分数已保存。", registerOk: "已注册为 {username}。", loginOk: "已登录为 {username}。", contactSent: "消息已成功发送。", contactStored: "你的消息已保存，邮件发送尚未完全配置。" },
  ru: { navHome: "Главная", navAccount: "Аккаунт", navContact: "Контакты", navLegal: "Правовая информация", navPrivacy: "Конфиденциальность", cookieTitle: "Ваш выбор для cookie и похожих хранилищ", cookieBody: "Необходимые cookie остаются активными для входа и защищённых сессий. Аналитика и маркетинг выключены, пока вы их не разрешите.", cookieNecessary: "Необходимые", cookieNecessaryBody: "Нужны для сессий, входа и базовых функций.", cookieAnalytics: "Аналитика", cookieAnalyticsBody: "Для будущей статистики посещаемости и использования.", cookieMarketing: "Маркетинг", cookieMarketingBody: "Для будущей рекламы и персонализированного показа.", cookieOnlyNecessary: "Только необходимые", cookieSave: "Сохранить", cookieAll: "Принять всё", accountLink: "Аккаунт", loginRequired: "Сначала войдите, если хотите сохранять очки.", playRound: "Сначала сыграйте раунд и получите корректный счёт.", scoreSaved: "Счёт сохранён.", registerOk: "Регистрация выполнена: {username}.", loginOk: "Вы вошли как {username}.", contactSent: "Сообщение успешно отправлено.", contactStored: "Сообщение сохранено. Отправка по почте ещё не настроена полностью." },
};

const pageMeta = {
  "/": { de: ["Retro Arcade", "Retro Arcade ist eine Arcade-Spielesammlung mit Snake, Pong, Breakout, Tetris, Space Invaders, Asteroids, Pac-Man, Pinball und weiteren Browser-Klassikern."], en: ["Retro Arcade", "Retro Arcade is an arcade collection with Snake, Pong, Breakout, Tetris, Space Invaders, Asteroids, Pac-Man, Pinball and more browser classics."], es: ["Retro Arcade", "Retro Arcade es una colección arcade con Snake, Pong, Breakout, Tetris, Space Invaders, Asteroids, Pac-Man, Pinball y más clásicos del navegador."], fr: ["Retro Arcade", "Retro Arcade est une collection de jeux d'arcade avec Snake, Pong, Breakout, Tetris, Space Invaders, Asteroids, Pac-Man, Pinball et d'autres classiques du navigateur."], zh: ["Retro Arcade", "Retro Arcade 是一个街机游戏合集，包含 Snake、Pong、Breakout、Tetris、Space Invaders、Asteroids、Pac-Man、Pinball 等经典浏览器游戏。"], ru: ["Retro Arcade", "Retro Arcade — это коллекция аркадных игр со Snake, Pong, Breakout, Tetris, Space Invaders, Asteroids, Pac-Man, Pinball и другими классическими браузерными играми。"] },
  "/index.html": "same",
  "/account.html": { de: ["Account | Retro Arcade", "Registrierung und Login für Retro Arcade, optional für Scoreboards und gespeicherte Spielestände."], en: ["Account | Retro Arcade", "Sign up and login for Retro Arcade, optional for scoreboards and saved scores."], es: ["Cuenta | Retro Arcade", "Registro e inicio de sesión para Retro Arcade, opcional para marcadores y puntuaciones guardadas."], fr: ["Compte | Retro Arcade", "Inscription et connexion pour Retro Arcade, optionnelles pour les classements et scores enregistrés."], zh: ["账户 | Retro Arcade", "Retro Arcade 的注册与登录，可选用于排行榜和分数保存。"], ru: ["Аккаунт | Retro Arcade", "Регистрация и вход в Retro Arcade, опционально для таблиц лидеров и сохранения очков."] },
};

const pageSelectors = {
  "/": {
    de: [[".hero__copy .eyebrow", "Full Floor"],[".hero__copy h1", "Die Arcade-Halle ist jetzt komplett offen."],[".hero__copy .lead", "Von Snake und Pong bis zu Space Invaders, Asteroids, Pac-Man, Pinball und der neuen Jump-&-Run-Welle: jede Maschine hat ihren eigenen Cabinet-Look, aber dieselbe Seite als Zuhause."],["#games .section__heading .eyebrow", "Playable Line-up"],["#games .section__heading h2", "Alle Automaten"],["#games .section__text", "Zwölf spielbare Seiten, optionale Accounts und persistente Scoreboards für eingeloggte Nutzer."],[".floating-scores .eyebrow", "Letzte Highscores"],[".floating-scores h2", "Neue Einträge"]],
    en: [[".hero__copy .eyebrow", "Full Floor"],[".hero__copy h1", "The arcade hall is fully open now."],[".hero__copy .lead", "From Snake and Pong to Space Invaders, Asteroids, Pac-Man, Pinball and the new jumping wave: every machine has its own cabinet look, but the same home."],["#games .section__heading .eyebrow", "Playable Line-up"],["#games .section__heading h2", "All machines"],["#games .section__text", "Twelve playable pages, optional accounts and persistent scoreboards for signed-in players."],[".floating-scores .eyebrow", "Latest highscores"],[".floating-scores h2", "New entries"]],
    es: [[".hero__copy .eyebrow", "Sala completa"],[".hero__copy h1", "La sala arcade ya está completamente abierta."],[".hero__copy .lead", "Desde Snake y Pong hasta Space Invaders, Asteroids, Pac-Man, Pinball y la nueva ola de saltos: cada máquina tiene su propio estilo, pero el mismo hogar."],["#games .section__heading .eyebrow", "Cartel jugable"],["#games .section__heading h2", "Todas las máquinas"],["#games .section__text", "Doce páginas jugables, cuentas opcionales y marcadores persistentes para usuarios conectados."],[".floating-scores .eyebrow", "Últimas puntuaciones"],[".floating-scores h2", "Nuevas entradas"]],
    fr: [[".hero__copy .eyebrow", "Salle complète"],[".hero__copy h1", "La salle d'arcade est maintenant entièrement ouverte."],[".hero__copy .lead", "De Snake et Pong à Space Invaders, Asteroids, Pac-Man, Pinball et la nouvelle vague de sauts: chaque borne a son style, mais le même foyer."],["#games .section__heading .eyebrow", "Programmation jouable"],["#games .section__heading h2", "Toutes les bornes"],["#games .section__text", "Douze pages jouables, des comptes optionnels et des classements persistants pour les joueurs connectés."],[".floating-scores .eyebrow", "Derniers scores"],[".floating-scores h2", "Nouvelles entrées"]],
    zh: [[".hero__copy .eyebrow", "全场开放"],[".hero__copy h1", "街机大厅现已全面开放。"],[".hero__copy .lead", "从 Snake 和 Pong 到 Space Invaders、Asteroids、Pac-Man、Pinball 以及新的跳跃系列：每台机器都有自己的柜机风格，但共享同一个家。"],["#games .section__heading .eyebrow", "可玩阵容"],["#games .section__heading h2", "全部机器"],["#games .section__text", "十二个可玩页面、可选账户以及为已登录玩家保留的持久排行榜。"],[".floating-scores .eyebrow", "最新高分"],[".floating-scores h2", "新记录"]],
    ru: [[".hero__copy .eyebrow", "Полный зал"],[".hero__copy h1", "Аркадный зал теперь полностью открыт."],[".hero__copy .lead", "От Snake и Pong до Space Invaders, Asteroids, Pac-Man, Pinball и новой волны прыжковых игр: у каждого автомата свой стиль, но один общий дом."],["#games .section__heading .eyebrow", "Игровая линейка"],["#games .section__heading h2", "Все автоматы"],["#games .section__text", "Двенадцать игровых страниц, опциональные аккаунты и постоянные таблицы лидеров для вошедших пользователей."],[".floating-scores .eyebrow", "Последние рекорды"],[".floating-scores h2", "Новые записи"]],
  },
  "/account.html": {
    de: [[".marquee .kicker", "Player Account"],[".marquee h1", "Optional anmelden, weiter frei spielen."],[".marquee p:not(.kicker)", "Ohne Login kannst du alle Spiele weiter direkt starten. Mit Account bekommst du gespeicherte Scores und Scoreboards unter deinem Nutzernamen."]],
    en: [[".marquee .kicker", "Player Account"],[".marquee h1", "Sign in optionally and keep playing freely."],[".marquee p:not(.kicker)", "Without logging in, you can keep launching every game instantly. With an account, you get saved scores and scoreboards under your username."]],
    es: [[".marquee .kicker", "Cuenta de jugador"],[".marquee h1", "Inicia sesión de forma opcional y sigue jugando libremente."],[".marquee p:not(.kicker)", "Sin iniciar sesión puedes seguir jugando de inmediato. Con una cuenta obtienes puntuaciones guardadas y marcadores con tu nombre de usuario."]],
    fr: [[".marquee .kicker", "Compte joueur"],[".marquee h1", "Connecte-toi si tu veux et continue à jouer librement."],[".marquee p:not(.kicker)", "Sans connexion, tu peux lancer tous les jeux immédiatement. Avec un compte, tu obtiens des scores enregistrés et des classements sous ton nom d'utilisateur."]],
    zh: [[".marquee .kicker", "玩家账户"],[".marquee h1", "可选登录，继续自由游玩。"],[".marquee p:not(.kicker)", "不登录也可以直接开始所有游戏。使用账户后，你的分数和排行榜记录会保存在用户名下。"]],
    ru: [[".marquee .kicker", "Аккаунт игрока"],[".marquee h1", "Вход по желанию, играть можно и без него."],[".marquee p:not(.kicker)", "Без входа можно сразу запускать все игры. С аккаунтом ваши очки и места в таблицах будут сохраняться под вашим именем."]],
  },
};

function getPreferredLanguage() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && strings[stored]) return stored;
  const browser = (navigator.language || "de").slice(0, 2).toLowerCase();
  return strings[browser] ? browser : "de";
}

let currentLanguage = "de";

function t(key, vars = {}) {
  const value = strings[currentLanguage]?.[key] || strings.de[key] || key;
  return Object.entries(vars).reduce((text, [name, replacement]) => text.replace("{" + name + "}", replacement), value);
}

function currentPath() {
  return window.location.pathname === "/" ? "/" : window.location.pathname;
}

function updateMeta() {
  const path = currentPath();
  const metaCopy = pageMeta[path] === "same" ? pageMeta["/"] : pageMeta[path];
  if (!metaCopy || !metaCopy[currentLanguage]) return;
  document.title = metaCopy[currentLanguage][0];
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", metaCopy[currentLanguage][1]);
  document.documentElement.lang = currentLanguage;
}

function updateHeaderNavText() {
  const headerLinks = Array.from(document.querySelectorAll('.site-header .site-nav > a'));
  const isHomePage = currentPath() === '/' || currentPath() === '/index.html';
  headerLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    if ((href === './index.html' || href === '../../index.html') && (!link.hasAttribute('aria-current') || isHomePage)) {
      link.textContent = t('navHome');
      return;
    }
    if ((href === './account.html' || href === '/account.html' || href === '../../account.html') && !link.hasAttribute('aria-current')) {
      link.textContent = t('navAccount');
      return;
    }
    if ((href === './impressum.html' || href === '../../impressum.html')) {
      link.textContent = t('navLegal');
      return;
    }
    if ((href === './privacy.html' || href === '../../privacy.html')) {
      link.textContent = t('navPrivacy');
    }
  });
}

function updateStaticText() {
  updateHeaderNavText();
  const pageCopy = pageSelectors[currentPath()];
  if (!pageCopy || !pageCopy[currentLanguage]) return;
  pageCopy[currentLanguage].forEach(([selector, value]) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  });
}

function renderLanguageSwitch() {
  document.querySelectorAll('[data-language-switch]').forEach((node) => node.remove());
  const headerNav = document.querySelector('.site-header .site-nav');
  if (!headerNav) return;
  const wrapper = document.createElement('span');
  wrapper.className = 'language-switch';
  wrapper.dataset.languageSwitch = 'true';
  languages.forEach((language) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'language-switch__button';
    button.textContent = language.flag;
    button.title = language.label;
    button.setAttribute('aria-label', language.label);
    if (language.code === currentLanguage) button.setAttribute('aria-pressed', 'true');
    button.addEventListener('click', () => setLanguage(language.code));
    wrapper.appendChild(button);
  });
  headerNav.appendChild(wrapper);
}

function setLanguage(language) {
  if (!strings[language]) return;
  currentLanguage = language;
  window.localStorage.setItem(STORAGE_KEY, language);
  document.dispatchEvent(new CustomEvent('retro-arcade-language-change', { detail: { language } }));
  window.location.reload();
}

export function initI18n() {
  if (typeof window === 'undefined') return;
  currentLanguage = getPreferredLanguage();
  window.retroArcadeI18n = { t, setLanguage, getLanguage: () => currentLanguage, languages };
  updateMeta();
  updateStaticText();
  renderLanguageSwitch();
}
