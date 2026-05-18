const STORAGE_KEY = "serbian-cards";

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const sourceWords = window.SERBIAN_WORDS || [
  { word: "zdravo", transcription: "[здраво]", translation: "привет" },
  { word: "hvala", transcription: "[хвала]", translation: "спасибо" },
  { word: "molim", transcription: "[молим]", translation: "пожалуйста" },
  { word: "dobro jutro", transcription: "[добро ютро]", translation: "доброе утро" },
  { word: "vidimo se", transcription: "[видимо се]", translation: "увидимся" },
  { word: "prijatelj", transcription: "[приятель]", translation: "друг" },
];

const defaultCards = sourceWords.map((card) => ({
  id: createId(),
  word: card.word,
  transcription: card.transcription,
  translation: card.translation,
  example: card.example || "",
  exampleTranscription: card.exampleTranscription || "",
  exampleTranslation: card.exampleTranslation || "",
  learned: false,
}));

const elements = {
  card: document.querySelector("#flashcard"),
  cardLabel: document.querySelector("#card-label"),
  word: document.querySelector("#word"),
  transcription: document.querySelector("#transcription"),
  exampleToggle: document.querySelector("#example-toggle"),
  examplePanel: document.querySelector("#example-panel"),
  example: document.querySelector("#example"),
  exampleTranscription: document.querySelector("#example-transcription"),
  exampleTranslation: document.querySelector("#example-translation"),
  translation: document.querySelector("#translation"),
  knowButton: document.querySelector("#know-button"),
  nextButton: document.querySelector("#next-button"),
  activeCount: document.querySelector("#active-count"),
  learnedCount: document.querySelector("#learned-count"),
  allListCount: document.querySelector("#all-list-count"),
  learnedListCount: document.querySelector("#learned-list-count"),
  allWordsList: document.querySelector("#all-words-list"),
  learnedWordsList: document.querySelector("#learned-words-list"),
  toggleListsButton: document.querySelector("#toggle-lists-button"),
  wordLists: document.querySelector("#word-lists"),
  form: document.querySelector("#word-form"),
  newWord: document.querySelector("#new-word"),
  newTranscription: document.querySelector("#new-transcription"),
  newTranslation: document.querySelector("#new-translation"),
  newExample: document.querySelector("#new-example"),
  newExampleTranslation: document.querySelector("#new-example-translation"),
};

let cards = loadCards();
let currentCard = null;
let isTranslationVisible = false;
let isExampleVisible = false;
let areListsVisible = false;

function loadCards() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return defaultCards;
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? mergeWithDefaultCards(parsed) : defaultCards;
  } catch {
    return defaultCards;
  }
}

function getCardKey(card) {
  return `${card.word.trim().toLowerCase()}::${card.translation.trim().toLowerCase()}`;
}

function mergeWithDefaultCards(savedCards) {
  const defaultByKey = new Map(defaultCards.map((card) => [getCardKey(card), card]));
  const enrichedSavedCards = savedCards.map((card) => ({
    ...defaultByKey.get(getCardKey(card)),
    ...card,
    example: defaultByKey.has(getCardKey(card)) ? defaultByKey.get(getCardKey(card)).example : card.example || "",
    exampleTranscription: defaultByKey.has(getCardKey(card))
      ? defaultByKey.get(getCardKey(card)).exampleTranscription
      : card.exampleTranscription || "",
    exampleTranslation: defaultByKey.has(getCardKey(card))
      ? defaultByKey.get(getCardKey(card)).exampleTranslation
      : card.exampleTranslation || "",
  }));
  const savedByKey = new Map(enrichedSavedCards.map((card) => [getCardKey(card), card]));
  const missingDefaultCards = defaultCards.filter((card) => !savedByKey.has(getCardKey(card)));

  return [...enrichedSavedCards, ...missingDefaultCards];
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function getActiveCards() {
  return cards.filter((card) => !card.learned);
}

function isSingleDisplayWord(word) {
  return !/[\s/]/.test(word.trim());
}

function transcribeSerbian(text) {
  const pairs = [
    ["Dž", "Џ"],
    ["DŽ", "Џ"],
    ["dž", "џ"],
    ["Lj", "Љ"],
    ["LJ", "Љ"],
    ["lj", "љ"],
    ["Nj", "Њ"],
    ["NJ", "Њ"],
    ["nj", "њ"],
  ];
  const chars = {
    a: "а",
    b: "б",
    c: "ц",
    č: "ч",
    ć: "ћ",
    d: "д",
    đ: "ђ",
    e: "е",
    f: "ф",
    g: "г",
    h: "х",
    i: "и",
    j: "ј",
    k: "к",
    l: "л",
    m: "м",
    n: "н",
    o: "о",
    p: "п",
    r: "р",
    s: "с",
    š: "ш",
    t: "т",
    u: "у",
    v: "в",
    z: "з",
    ž: "ж",
    A: "А",
    B: "Б",
    C: "Ц",
    Č: "Ч",
    Ć: "Ћ",
    D: "Д",
    Đ: "Ђ",
    E: "Е",
    F: "Ф",
    G: "Г",
    H: "Х",
    I: "И",
    J: "Ј",
    K: "К",
    L: "Л",
    M: "М",
    N: "Н",
    O: "О",
    P: "П",
    R: "Р",
    S: "С",
    Š: "Ш",
    T: "Т",
    U: "У",
    V: "В",
    Z: "З",
    Ž: "Ж",
  };

  let output = text;
  pairs.forEach(([from, to]) => {
    output = output.replaceAll(from, to);
  });

  return `[${[...output].map((character) => chars[character] || character).join("")}]`;
}

function fitWordToCard() {
  const word = elements.word;
  word.style.fontSize = "";

  if (!word.classList.contains("single-word")) {
    return;
  }

  const cardStyles = getComputedStyle(elements.card);
  const cardWidth =
    elements.card.clientWidth - Number.parseFloat(cardStyles.paddingLeft) - Number.parseFloat(cardStyles.paddingRight);
  const minimumSize = 44;
  let currentSize = Number.parseFloat(getComputedStyle(word).fontSize);

  while (word.scrollWidth > cardWidth && currentSize > minimumSize) {
    currentSize -= 2;
    word.style.fontSize = `${currentSize}px`;
  }
}

function pickNextCard() {
  const activeCards = getActiveCards();

  if (!activeCards.length) {
    currentCard = null;
    render();
    return;
  }

  if (activeCards.length === 1) {
    currentCard = activeCards[0];
    isTranslationVisible = false;
    isExampleVisible = false;
    render();
    return;
  }

  let nextCard = activeCards[Math.floor(Math.random() * activeCards.length)];

  while (currentCard && nextCard.id === currentCard.id) {
    nextCard = activeCards[Math.floor(Math.random() * activeCards.length)];
  }

  currentCard = nextCard;
  isTranslationVisible = false;
  isExampleVisible = false;
  render();
}

function render() {
  const activeCards = getActiveCards();
  const learnedCards = cards.filter((card) => card.learned);

  elements.activeCount.textContent = activeCards.length;
  elements.learnedCount.textContent = learnedCards.length;
  renderWordLists(cards, learnedCards);

  if (!currentCard) {
    elements.cardLabel.textContent = "Все слова выучены";
    elements.word.textContent = "Готово";
    elements.transcription.textContent = "Добавь новое слово, чтобы продолжить";
    elements.exampleToggle.hidden = true;
    elements.examplePanel.hidden = true;
    elements.translation.hidden = true;
    elements.knowButton.disabled = true;
    elements.nextButton.disabled = true;
    return;
  }

  elements.cardLabel.textContent = isTranslationVisible ? "Перевод" : "Нажми, чтобы увидеть перевод";
  elements.word.textContent = currentCard.word;
  elements.word.classList.toggle("single-word", isSingleDisplayWord(currentCard.word));
  elements.transcription.textContent = currentCard.transcription;
  elements.example.textContent = currentCard.example;
  elements.exampleTranscription.textContent = currentCard.exampleTranscription || transcribeSerbian(currentCard.example);
  elements.exampleTranslation.textContent = currentCard.exampleTranslation;
  elements.exampleToggle.hidden = !currentCard.example;
  elements.exampleToggle.setAttribute("aria-expanded", String(isExampleVisible));
  elements.examplePanel.hidden = !currentCard.example || !isExampleVisible;
  elements.translation.textContent = currentCard.translation;
  elements.translation.hidden = !isTranslationVisible;
  elements.knowButton.disabled = false;
  elements.nextButton.disabled = activeCards.length < 2;
  requestAnimationFrame(fitWordToCard);
}

function createWordListItem(card, showStatus = false) {
  const item = document.createElement("li");
  item.className = "word-item";

  const main = document.createElement("div");
  main.className = "word-main";

  const title = document.createElement("span");
  title.className = "word-title";
  title.textContent = card.word;

  const meta = document.createElement("span");
  meta.className = "word-meta";
  meta.textContent = card.transcription;

  const translation = document.createElement("span");
  translation.className = "word-translation";
  translation.textContent = card.translation;

  main.append(title, meta);
  item.append(main, translation);

  if (showStatus && card.learned) {
    const status = document.createElement("span");
    status.className = "word-status";
    status.textContent = "выучено";
    main.append(status);
  }

  return item;
}

function renderEmptyList(list, text) {
  const item = document.createElement("li");
  item.className = "empty-list";
  item.textContent = text;
  list.append(item);
}

function renderWordLists(allCards, learnedCards) {
  elements.allListCount.textContent = allCards.length;
  elements.learnedListCount.textContent = learnedCards.length;
  elements.allWordsList.replaceChildren();
  elements.learnedWordsList.replaceChildren();

  if (!allCards.length) {
    renderEmptyList(elements.allWordsList, "Пока нет слов.");
  } else {
    allCards.forEach((card) => {
      elements.allWordsList.append(createWordListItem(card, true));
    });
  }

  if (!learnedCards.length) {
    renderEmptyList(elements.learnedWordsList, "Пока нет выученных слов.");
  } else {
    learnedCards.forEach((card) => {
      elements.learnedWordsList.append(createWordListItem(card));
    });
  }
}

function toggleLists() {
  areListsVisible = !areListsVisible;
  elements.wordLists.hidden = !areListsVisible;
  elements.toggleListsButton.textContent = areListsVisible ? "Скрыть списки слов" : "Показать списки слов";
  elements.toggleListsButton.setAttribute("aria-expanded", String(areListsVisible));
}

function addCard(event) {
  event.preventDefault();

  const word = elements.newWord.value.trim();
  const transcription = elements.newTranscription.value.trim();
  const translation = elements.newTranslation.value.trim();
  const example = elements.newExample.value.trim();
  const exampleTranslation = elements.newExampleTranslation.value.trim();

  if (!word || !transcription || !translation) {
    return;
  }

  const newCard = {
    id: createId(),
    word,
    transcription,
    translation,
    example,
    exampleTranscription: example ? transcribeSerbian(example) : "",
    exampleTranslation,
    learned: false,
  };

  cards = [newCard, ...cards];
  currentCard = newCard;
  isTranslationVisible = false;
  isExampleVisible = false;
  saveCards();
  elements.form.reset();
  elements.newWord.focus();
  render();
}

function markCurrentAsLearned() {
  if (!currentCard) {
    return;
  }

  cards = cards.map((card) => (card.id === currentCard.id ? { ...card, learned: true } : card));
  saveCards();
  pickNextCard();
}

elements.card.addEventListener("click", () => {
  if (!currentCard) {
    return;
  }

  isTranslationVisible = !isTranslationVisible;
  render();
});

elements.card.addEventListener("keydown", (event) => {
  if (!currentCard || !["Enter", " "].includes(event.key)) {
    return;
  }

  event.preventDefault();
  isTranslationVisible = !isTranslationVisible;
  render();
});

elements.exampleToggle.addEventListener("click", (event) => {
  event.stopPropagation();

  if (!currentCard?.example) {
    return;
  }

  isExampleVisible = !isExampleVisible;
  render();
});

elements.nextButton.addEventListener("click", pickNextCard);
elements.knowButton.addEventListener("click", markCurrentAsLearned);
elements.toggleListsButton.addEventListener("click", toggleLists);
elements.form.addEventListener("submit", addCard);
window.addEventListener("resize", fitWordToCard);

pickNextCard();
