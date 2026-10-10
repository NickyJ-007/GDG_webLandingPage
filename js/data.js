// =========================================================================
// EDITABLE CONTENT — speaker lineup and the About blurb.
// Links, the workshop date and registration/WhatsApp URLs stay in config.js;
// this file only holds text content you'll want to swap per event.
// =========================================================================

// Add a photo at assets/speakers/<id>.jpg and it will be used automatically.
// Leave photo as null to show a clean placeholder avatar.
const SPEAKERS = [
  {
    id: "nikhil-html",
    name: "Nikhil",
    topic: "HTML",
    color: "blue",
    branch: "AI-DS",
    semester: "Semester 3",
    photo: "assets/speakers/Nikhil_HTML.png",
    alt: "Nikhil, speaker for HTML track",
    objectPosition: "center 20%",
    description:
      "Learn the foundations of HTML by building a real web page from scratch. Explore the basic HTML document structure, headings, paragraphs, links, images, and lists. Then put it into practice by creating the content for an About Me page.",
  },
  {
    id: "goutham-css",
    name: "Goutham",
    topic: "CSS",
    color: "red",
    branch: "CSE",
    semester: "Semester 3",
    photo: "assets/speakers/Goutham_CSS.jpeg",
    alt: "Goutham, speaker for CSS track",
    objectPosition: "center 15%",
    description:
      "Bring your HTML page to life with CSS. Learn how to connect a stylesheet, use element, class, and ID selectors, style text and backgrounds, and control spacing with padding, margin, and borders. Finish by creating a clean, centred card layout with rounded corners and simple shadows.",
  },
  {
    id: "chinmay-js",
    name: "Chinmay",
    topic: "JavaScript",
    color: "yellow",
    branch: "CSE",
    semester: "Semester 3",
    photo: "assets/speakers/Chinmay_JS.png",
    alt: "Chinmay, speaker for JavaScript track",
    objectPosition: "center 25%",
    description:
      "Make your web page interactive with JavaScript. Learn how to select an element, listen for a click event, and update page content or toggle a CSS class. Put these concepts into practice by building a button that changes the greeting or toggles dark mode.",
  },
  {
    id: "nandhini-deployment",
    name: "Nandhini",
    topic: "Deployment",
    color: "green",
    branch: "CSE",
    semester: "Semester 3",
    photo: "assets/speakers/Nandhini_Deployment.png",
    alt: "Nandhini, speaker for Deployment track",
    objectPosition: "center 20%",
    description:
      "Take your website live and share it with the world. Learn what deployment means, explore hosting options such as Netlify, GitHub Pages, and Vercel, and publish your project using the beginner-friendly Netlify Drop workflow. Finish with a public URL you can open and share.",
  },
];

const ABOUT_TEXT =
  "GDG on Campus, UVCE is a student-led chapter of Google Developer Groups at " +
  "University Visvesvaraya College of Engineering. We run hands-on workshops, " +
  "talks and build nights across web, mobile, cloud and AI, so students learn " +
  "by shipping real projects, not just reading about them.";
