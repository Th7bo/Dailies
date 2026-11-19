export type CatalogEntry = {
  id: string;
  name: string;
  url: string;
  category: Category;
  description: string;
  /** Site blocks iframes with JavaScript, which the header check can't see. */
  forceNewTab?: boolean;
};

export const CATEGORIES = {
  words: "Words",
  geography: "Geography",
  logic: "Logic & numbers",
  trivia: "Trivia",
  music: "Music",
  screen: "Movies & TV",
  gaming: "Gaming",
  other: "Other",
} as const;
export type Category = keyof typeof CATEGORIES;

export const CATALOG: CatalogEntry[] = [
  // Words
  { id: "wordle", name: "Wordle", url: "https://www.nytimes.com/games/wordle/index.html", category: "words", description: "Guess the five-letter word in six tries." },
  { id: "connections", name: "Connections", url: "https://www.nytimes.com/games/connections", category: "words", description: "Sort sixteen words into four hidden groups." },
  { id: "strands", name: "Strands", url: "https://www.nytimes.com/games/strands", category: "words", description: "Find the themed words hiding in a letter grid." },
  { id: "nyt-mini", name: "The Mini", url: "https://www.nytimes.com/crosswords/game/mini", category: "words", description: "A five-by-five crossword you can finish over coffee." },
  { id: "quordle", name: "Quordle", url: "https://www.merriam-webster.com/games/quordle/", category: "words", description: "Four Wordles at once, nine guesses." },
  { id: "waffle", name: "Waffle", url: "https://wafflegame.net/daily", category: "words", description: "Swap letters to fix a waffle-shaped word grid." },
  { id: "squaredle", name: "Squaredle", url: "https://squaredle.app", category: "words", description: "Trace every word you can find in the square." },
  { id: "contexto", name: "Contexto", url: "https://contexto.me", category: "words", description: "Find the secret word by how close in meaning your guesses are." },
  { id: "semantle", name: "Semantle", url: "https://semantle.com", category: "words", description: "Guess the word using semantic similarity scores." },
  { id: "wordiply", name: "Wordiply", url: "https://www.wordiply.com", category: "words", description: "Build the longest word that contains today's letters." },

  // Geography
  { id: "worldle", name: "Worldle", url: "https://worldle.teuteuf.fr", category: "geography", description: "Name the country from its silhouette.", forceNewTab: true },
  { id: "globle", name: "Globle", url: "https://globle-game.com", category: "geography", description: "Find the mystery country on a globe that gets warmer." },
  { id: "tradle", name: "Tradle", url: "https://games.oec.world/en/tradle/", category: "geography", description: "Guess the country from what it exports." },
  { id: "travle", name: "Travle", url: "https://travle.earth", category: "geography", description: "Connect two countries through their neighbours." },
  { id: "flagle", name: "Flagle", url: "https://www.flagle.io", category: "geography", description: "Reveal a flag piece by piece and name it." },
  { id: "timeguessr", name: "TimeGuessr", url: "https://timeguessr.com", category: "geography", description: "Place a photo on the map and in the right year." },

  // Logic & numbers
  { id: "nerdle", name: "Nerdle", url: "https://nerdlegame.com", category: "logic", description: "Wordle, but the answer is an equation." },
  { id: "queens", name: "Queens", url: "https://www.linkedin.com/games/queens", category: "logic", description: "Place one queen per row, column and colour region." },
  { id: "zip", name: "Zip", url: "https://www.linkedin.com/games/zip", category: "logic", description: "Draw one path through every cell in order." },
  { id: "tango", name: "Tango", url: "https://www.linkedin.com/games/tango", category: "logic", description: "Fill the grid with suns and moons, balanced." },
  { id: "angle", name: "Angle", url: "https://www.angle.wtf", category: "logic", description: "Guess the angle in four tries." },

  // Trivia
  { id: "metazooa", name: "Metazooa", url: "https://metazooa.com", category: "trivia", description: "Find the animal by climbing the tree of life." },
  { id: "immaculate-grid", name: "Immaculate Grid", url: "https://www.immaculategrid.com", category: "trivia", description: "Name baseball players who fit both row and column." },

  // Music
  { id: "bandle", name: "Bandle", url: "https://bandle.app", category: "music", description: "Name the song as instruments are added one by one." },

  // Movies & TV
  { id: "framed", name: "Framed", url: "https://framed.wtf", category: "screen", description: "Name the movie from six stills." },

  // Gaming
  { id: "loldle", name: "LoLdle", url: "https://loldle.net", category: "gaming", description: "Guess the League of Legends champion." },
  { id: "pokedoku", name: "PokeDoku", url: "https://pokedoku.com", category: "gaming", description: "Fill a grid with Pokémon that match both clues." },

  // Other
  { id: "costcodle", name: "Costcodle", url: "https://costcodle.com", category: "other", description: "Guess the price of a Costco item." },
];
