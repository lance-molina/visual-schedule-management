// i18n.js: English and Filipino strings for the navigation and the child view.
// Scope: only these screens are translated; the adult pages stay in English (listed under Known limitations).
// NOTE: the Filipino strings below were written without a native-speaker review. Have a fluent speaker
// check them BEFORE the usability sessions and record who reviewed them.

export const STRINGS = {
  en: {
    nav_dashboard: "Dashboard",
    nav_schedule: "Schedule creator",
    nav_child_view: "Child view",
    nav_progress: "Progress",
    nav_settings: "Settings",
    menu: "Menu",
    logout: "Log out",
    done: "Done",
    now: "Now",
    later: "Later",
    undo: "Undo",
    marked_done: "marked done",
    great_job: "Great job!",
    all_done: "All done for today!",
    all_done_sub: "You finished every task.",
    no_routine: "No routine today.",
    no_routine_sub: "Ask your grown-up to make one.",
    try_again: "Try again",
    error_load: "We could not load today's tasks.",
    back_adult: "Back to adult screens",
    exit_title: "Leave the child view?",
    exit_body: "A grown-up should confirm this.",
    exit_confirm: "Yes, leave",
    cancel: "Cancel",
    choose_child: "Who is this for?",
    no_children: "There are no children yet. Ask a grown-up to add one.",
    save: "Save",
  },
  fil: {
    nav_dashboard: "Dashboard",
    nav_schedule: "Gumawa ng iskedyul",
    nav_child_view: "Para sa bata",
    nav_progress: "Progreso",
    nav_settings: "Mga setting",
    menu: "Menu",
    logout: "Mag-log out",
    done: "Tapos na",
    now: "Ngayon",
    later: "Mamaya",
    undo: "Bawiin",
    marked_done: "tapos na",
    great_job: "Magaling!",
    all_done: "Tapos na ang lahat ngayong araw!",
    all_done_sub: "Natapos mo ang lahat ng gawain.",
    no_routine: "Walang gawain ngayon.",
    no_routine_sub: "Magpatulong sa nakatatanda para gumawa nito.",
    try_again: "Subukan muli",
    error_load: "Hindi namin ma-load ang mga gawain ngayon.",
    back_adult: "Bumalik sa mga screen ng matatanda",
    exit_title: "Aalis sa view ng bata?",
    exit_body: "Dapat kumpirmahin ito ng nakatatanda.",
    exit_confirm: "Oo, aalis",
    cancel: "Kanselahin",
    choose_child: "Para kanino ito?",
    no_children: "Wala pang bata. Magpatulong sa nakatatanda na magdagdag.",
    save: "I-save",
  },
};

export function t(key, lang = "en") {
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
}
