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
      "Learn the foundations of HTML by building a real web page from scratch. Explore document structure, headings, links, images, and lists, then put it into practice by structuring an interactive About Me developer card.",
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
      "Bring your HTML structure to life with CSS. Learn element and class selectors, custom color styling, and box-model spacing using padding, margins, and borders. Finish by assembling a clean, centered card container with rounded corners and custom drop shadows.",
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
      "Make your web page interactive using JavaScript. Learn how to select DOM elements, listen for user click events, and update content dynamically by building real-time greeting changes and a working dark mode toggle.",
  },
  {
    id: "nandhini-deployment",
    name: "Nandini",
    topic: "Deployment",
    color: "green",
    branch: "CSE",
    semester: "Semester 3",
    photo: "assets/speakers/Nandhini_Deployment.png",
    alt: "Nandhini, speaker for Deployment track",
    objectPosition: "center 20%",
    description:
      "Take your website live and share it with the world. Learn how modern web hosting works, explore platforms like GitHub Pages and Netlify, and launch your project with a live public URL you can add straight to your profile.",
  },
];

const ABOUT_TEXT =
  "GDG on Campus, UVCE is a student-led chapter of Google Developer Groups at " +
  "University Visvesvaraya College of Engineering. We run hands-on workshops, " +
  "talks and build nights across web, mobile, cloud and AI, so students learn " +
  "by shipping real projects, not just reading about them.";
