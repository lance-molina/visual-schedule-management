// activities.js: the static activity library for the schedule creator (no database table needed).
// Covers eating, brushing teeth, dressing, toileting and washing hands, plus other daily routines,
// in four categories: hygiene, food, school and play.
// A task stores a COPY of the name and icon when it is added, so editing this file never changes
// schedules that already exist.
// Icons are Font Awesome 6 free "solid" class names. The backend only accepts names like fa-tooth.
// `minutes` is the default duration offered when the activity is added (the adult can change it).

export const CATEGORIES = [
  { id: "hygiene", label: "Hygiene" },
  { id: "food", label: "Food" },
  { id: "school", label: "School" },
  { id: "play", label: "Play" },
];

export const ACTIVITIES = [
  // Hygiene and self-care
  { id: "brush-teeth",  name: "Brush teeth",    icon: "fa-tooth",         category: "hygiene", minutes: 5 },
  { id: "wash-hands",   name: "Wash hands",     icon: "fa-hands-bubbles", category: "hygiene", minutes: 5 },
  { id: "toilet",       name: "Use the toilet", icon: "fa-toilet",        category: "hygiene", minutes: 5 },
  { id: "get-dressed",  name: "Get dressed",    icon: "fa-shirt",         category: "hygiene", minutes: 10 },
  { id: "bath",         name: "Take a bath",    icon: "fa-bath",          category: "hygiene", minutes: 20 },
  { id: "go-to-bed",    name: "Go to bed",      icon: "fa-bed",           category: "hygiene", minutes: 15 },
  // Food
  { id: "breakfast",    name: "Eat breakfast",  icon: "fa-bowl-food",     category: "food", minutes: 20 },
  { id: "eat",          name: "Eat a meal",     icon: "fa-utensils",      category: "food", minutes: 25 },
  { id: "snack",        name: "Eat a snack",    icon: "fa-apple-whole",   category: "food", minutes: 10 },
  { id: "drink-water",  name: "Drink water",    icon: "fa-glass-water",   category: "food", minutes: 5 },
  // School
  { id: "go-to-school", name: "Go to school",   icon: "fa-school",        category: "school", minutes: 30 },
  { id: "reading",      name: "Read a book",    icon: "fa-book-open",     category: "school", minutes: 15 },
  { id: "homework",     name: "Do homework",    icon: "fa-pencil",        category: "school", minutes: 30 },
  // Play
  { id: "play-time",    name: "Play time",      icon: "fa-puzzle-piece",  category: "play", minutes: 30 },
  { id: "outdoor-play", name: "Play outside",   icon: "fa-tree",          category: "play", minutes: 30 },
  { id: "music",        name: "Listen to music", icon: "fa-music",        category: "play", minutes: 15 },
];

export function categoryLabel(id) {
  return (CATEGORIES.find((c) => c.id === id) || { label: id }).label;
}
