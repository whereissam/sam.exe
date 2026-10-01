export type ShelfBook = {
  title: string;
  author: string;
  category: string;
  note: string;
  color: string;
  cover: string;
  href: string;
  details: string[];
  themes: string[];
  synopsisSource: string;
};

export const shelfBooks: ShelfBook[] = [
  { title: '舞・舞・舞 / Dance Dance Dance', author: '村上春樹 / Haruki Murakami', category: 'FICTION', note: 'A surreal novel of connection, disappearance, and the strange rhythms of everyday life.', color: '#b96848', cover: '/books/dance-dance-dance.png', href: 'https://www.goodreads.com/book/show/17800.Dance_Dance_Dance', details: ['An unnamed narrator returns to the Dolphin Hotel while searching for Kiki, a girlfriend who has disappeared. Familiar places become strange, and the enigmatic Sheep Man returns.', 'A follow-up to A Wild Sheep Chase, blending a detective story with surreal encounters and satire.'], themes: ['Connection', 'Mystery', 'Surrealism'], synopsisSource: 'https://www.penguinrandomhouse.com/books/118716/dance-dance-dance-by-haruki-murakami/' },
  { title: '我為你灑下月光：獻給被愛神附身的人', author: '簡媜', category: 'ESSAYS', note: 'Letters, memory, and love, woven into a collection of lyrical prose.', color: '#526f65', cover: '/books/moonlight.png', href: 'https://www.books.com.tw/products/0010733298', details: ['簡媜以友人留下的手札與信件為線索，回望情感、記憶，以及曾經交會的人與事。', '這本散文集以古典文學的語感，書寫愛情中的眷戀與遺憾，也是她寫作三十年的紀念之作。'], themes: ['愛情', '記憶', '書信'], synopsisSource: 'https://www.books.com.tw/products/0010733298' },
  { title: '莫斯科紳士', author: '亞莫爾．托歐斯 / Amor Towles', category: 'FICTION', note: 'A Gentleman in Moscow. A life unfolding within the walls of a grand hotel.', color: '#ad8543', cover: '/books/gentleman-in-moscow.png', href: 'https://www.books.com.tw/products/E070000563', details: ['In 1922, Count Alexander Rostov is sentenced to house arrest in Moscow’s Metropol Hotel. His world shrinks to its rooms and corridors while history continues outside.', 'Within that confined space, new encounters and relationships give his life an unexpected breadth.'], themes: ['Resilience', 'Friendship', 'History'], synopsisSource: 'https://www.amortowles.com/a-gentleman-in-moscow-about-the-book/' },
  { title: '三體 I / The Three-Body Problem', author: '劉慈欣 / Liu Cixin', category: 'SCIENCE FICTION', note: 'The first volume of Liu Cixin’s Three-Body trilogy.', color: '#263d57', cover: '/books/three-body-problem.png', href: 'https://us.macmillan.com/books/9781427251992/thethreebodyproblem/', details: ['Against the backdrop of China’s Cultural Revolution, a secret military project sends signals into space. An alien civilization receives them, setting the stage for first contact.', 'The opening volume of the trilogy asks how humanity responds when the discovery of another civilization becomes a threat—and a promise.'], themes: ['First contact', 'Civilization', 'Science'], synopsisSource: 'https://us.macmillan.com/books/9781427251992/thethreebodyproblem/' },
];
