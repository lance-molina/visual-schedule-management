// board-cards.js: the built-in starter cards for the talking board and the preset pictures an adult can pick.
// The pictures must match CARD_ICONS in backend/models/card.py (the API rejects anything else).

export const CATEGORIES = ["Food", "Emotions", "Activities", "Core"];      // stored as these English keys; Core = everyday words like Yes, No, Stop

export const PICTURES = ["fa-droplet", "fa-bowl-rice", "fa-glass-water", "fa-bread-slice", "fa-apple-whole", "fa-carrot", "fa-cookie-bite", "fa-egg", "fa-face-smile", "fa-face-sad-tear", "fa-face-angry", "fa-bed", "fa-face-surprise", "fa-puzzle-piece",
                         "fa-futbol", "fa-tv", "fa-toilet", "fa-bath", "fa-music", "fa-house", "fa-book", "fa-palette", "fa-bus", "fa-shirt", "fa-shoe-prints", "fa-hand", "fa-hand-holding-heart",
                         "fa-circle-plus", "fa-circle-stop", "fa-thumbs-up", "fa-thumbs-down", "fa-circle-check", "fa-moon"];

// `fil` is the Filipino word that is spoken when the language setting is Filipino (written by us, not yet reviewed).
export const BUILT_IN = [
  { label: "Water", fil: "Tubig", category: "Food", icon: "fa-droplet" },
  { label: "Rice", fil: "Kanin", category: "Food", icon: "fa-bowl-rice" },
  { label: "Milk", fil: "Gatas", category: "Food", icon: "fa-glass-water" },
  { label: "Bread", fil: "Tinapay", category: "Food", icon: "fa-bread-slice" },
  { label: "Apple", fil: "Mansanas", category: "Food", icon: "fa-apple-whole" },
  { label: "Happy", fil: "Masaya", category: "Emotions", icon: "fa-face-smile" },
  { label: "Sad", fil: "Malungkot", category: "Emotions", icon: "fa-face-sad-tear" },
  { label: "Angry", fil: "Galit", category: "Emotions", icon: "fa-face-angry" },
  { label: "Tired", fil: "Pagod", category: "Emotions", icon: "fa-bed" },
  { label: "Surprised", fil: "Gulat", category: "Emotions", icon: "fa-face-surprise" },
  { label: "Play", fil: "Laro", category: "Activities", icon: "fa-puzzle-piece" },
  { label: "Toilet", fil: "Banyo", category: "Activities", icon: "fa-toilet" },
  { label: "Watch TV", fil: "Manood ng TV", category: "Activities", icon: "fa-tv" },
  { label: "Bath", fil: "Maligo", category: "Activities", icon: "fa-bath" },
  { label: "Music", fil: "Musika", category: "Activities", icon: "fa-music" },
  { label: "Snack", fil: "Meryenda", category: "Food", icon: "fa-cookie-bite" },
  { label: "Sleepy", fil: "Antok", category: "Emotions", icon: "fa-moon" },
  { label: "Go home", fil: "Uwi na", category: "Activities", icon: "fa-house" },
  // Core words are spoken on their own (no "I want" in front); see board-sentence.js.
  { label: "More", fil: "Dagdag pa", category: "Core", icon: "fa-circle-plus" },
  { label: "Stop", fil: "Tigil", category: "Core", icon: "fa-circle-stop" },
  { label: "Yes", fil: "Oo", category: "Core", icon: "fa-thumbs-up" },
  { label: "No", fil: "Hindi", category: "Core", icon: "fa-thumbs-down" },
  { label: "Help", fil: "Tulong", category: "Core", icon: "fa-hand" },
  { label: "All done", fil: "Tapos na", category: "Core", icon: "fa-circle-check" },
];
