const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const sessions = new Map();

const starterBooks = [
  {
    "id": "bk-1",
    "title": "The God of Small Things",
    "author": "Arundhati Roy",
    "genre": "Fiction",
    "price": 499,
    "rating": 4.7,
    "description": "A lyrical family story set in Kerala, where small things can change everything.",
    "cover": "https://covers.openlibrary.org/b/isbn/9780812979657-L.jpg",
    "featured": true
  },
  {
    "id": "bk-2",
    "title": "Wings of Fire",
    "author": "A. P. J. Abdul Kalam & Arun Tiwari",
    "genre": "Memoir",
    "price": 299,
    "rating": 4.8,
    "description": "The inspiring journey of India’s former president, from Rameswaram to the country’s space and defence programmes.",
    "cover": "https://covers.openlibrary.org/b/isbn/9788173711466-L.jpg",
    "featured": true
  },
  {
    "id": "bk-3",
    "title": "The White Tiger",
    "author": "Aravind Adiga",
    "genre": "Fiction",
    "price": 399,
    "rating": 4.6,
    "description": "A sharp, darkly funny novel about ambition and class in modern India.",
    "cover": "https://covers.openlibrary.org/b/isbn/9781416562597-L.jpg",
    "featured": true
  },
  {
    "id": "bk-4",
    "title": "The Palace of Illusions",
    "author": "Chitra Banerjee Divakaruni",
    "genre": "Mythology",
    "price": 449,
    "rating": 4.7,
    "description": "The Mahabharata retold through the vivid voice of Draupadi.",
    "cover": "https://covers.openlibrary.org/b/isbn/9781400096206-L.jpg"
  },
  {
    "id": "bk-5",
    "title": "Train to Pakistan",
    "author": "Khushwant Singh",
    "genre": "Historical Fiction",
    "price": 299,
    "rating": 4.5,
    "description": "A moving story of one village caught in the upheaval of Partition.",
    "cover": "https://covers.openlibrary.org/b/isbn/9780143065883-L.jpg"
  },
  {
    "id": "bk-6",
    "title": "A Suitable Boy",
    "author": "Vikram Seth",
    "genre": "Fiction",
    "price": 599,
    "rating": 4.6,
    "description": "An expansive family saga set in a newly independent India.",
    "cover": "https://covers.openlibrary.org/b/isbn/9780060786526-L.jpg"
  },
  {
    "id": "bk-7",
    "title": "The Guide",
    "author": "R. K. Narayan",
    "genre": "Classic",
    "price": 249,
    "rating": 4.5,
    "description": "A charming classic about a tour guide whose life takes an unexpected turn.",
    "cover": "https://covers.openlibrary.org/b/isbn/9780143039648-L.jpg"
  },
  {
    "id": "bk-8",
    "title": "The Blue Umbrella",
    "author": "Ruskin Bond",
    "genre": "Fiction",
    "price": 199,
    "rating": 4.4,
    "description": "A gentle, much-loved tale of a girl and the beautiful umbrella everyone admires.",
    "cover": "https://covers.openlibrary.org/b/isbn/9788171673407-L.jpg"
  }
];

function readStore() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], books: starterBooks, carts: {}, orders: [] }, null, 2));
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  data.users ||= []; data.books ||= starterBooks; data.carts ||= {}; data.orders ||= [];
  return data;
}
function writeStore(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, DATA_FILE);
}
function publicUser(user) { return { id: user.id, name: user.name, email: user.email }; }
function getUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return token ? sessions.get(token) : null;
}
function requireUser(req, res, next) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: 'Please sign in to continue.' });
  req.user = user;
  next();
}
function cartDetails(data, userId) {
  const cart = data.carts[userId] || {};
  const items = Object.entries(cart).map(([bookId, quantity]) => {
    const book = data.books.find((item) => item.id === bookId);
    return book ? { ...book, quantity, subtotal: Number((book.price * quantity).toFixed(2)) } : null;
  }).filter(Boolean);
  return { items, count: items.reduce((sum, item) => sum + item.quantity, 0), total: Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)) };
}

app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/books', (req, res) => {
  const { search = '', genre = 'All', sort = 'featured' } = req.query;
  const query = String(search).trim().toLowerCase();
  let books = readStore().books.filter((book) => {
    const matchesText = !query || `${book.title} ${book.author} ${book.genre}`.toLowerCase().includes(query);
    return matchesText && (genre === 'All' || book.genre === genre);
  });
  if (sort === 'price-asc') books.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') books.sort((a, b) => b.price - a.price);
  if (sort === 'rating') books.sort((a, b) => b.rating - a.rating);
  res.json({ books, genres: ['All', ...new Set(readStore().books.map((book) => book.genre))] });
});
app.post('/api/auth/signup', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 60) return res.status(400).json({ message: 'Name must be between 2 and 60 characters.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  const data = readStore();
  if (data.users.some((user) => user.email === email)) return res.status(409).json({ message: 'An account with that email already exists.' });
  const salt = crypto.randomBytes(16).toString('hex');
  const user = { id: crypto.randomUUID(), name, email, salt, passwordHash: crypto.scryptSync(password, salt, 64).toString('hex'), createdAt: new Date().toISOString() };
  data.users.push(user); data.carts[user.id] = {}; writeStore(data);
  const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, user.id);
  res.status(201).json({ token, user: publicUser(user) });
});
app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = readStore().users.find((item) => item.email === email);
  if (!user || !crypto.timingSafeEqual(Buffer.from(user.passwordHash, 'hex'), crypto.scryptSync(password, user.salt, 64))) return res.status(401).json({ message: 'Email or password is incorrect.' });
  const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, user.id);
  res.json({ token, user: publicUser(user) });
});
app.get('/api/auth/me', requireUser, (req, res) => {
  const user = readStore().users.find((item) => item.id === req.user);
  user ? res.json({ user: publicUser(user) }) : res.status(401).json({ message: 'Account not found.' });
});
app.post('/api/auth/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  sessions.delete(token); res.json({ message: 'Signed out.' });
});
app.get('/api/cart', requireUser, (req, res) => res.json(cartDetails(readStore(), req.user)));
app.post('/api/cart/:bookId', requireUser, (req, res) => {
  const data = readStore();
  if (!data.books.some((book) => book.id === req.params.bookId)) return res.status(404).json({ message: 'Book not found.' });
  const quantity = Math.max(1, Math.min(20, Number(req.body.quantity) || 1));
  const cart = data.carts[req.user] ||= {};
  cart[req.params.bookId] = Math.min(20, (cart[req.params.bookId] || 0) + quantity);
  writeStore(data); res.json(cartDetails(data, req.user));
});
app.patch('/api/cart/:bookId', requireUser, (req, res) => {
  const data = readStore(); const cart = data.carts[req.user] ||= {};
  if (!cart[req.params.bookId]) return res.status(404).json({ message: 'Book is not in your cart.' });
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return res.status(400).json({ message: 'Quantity must be between 1 and 20.' });
  cart[req.params.bookId] = quantity; writeStore(data); res.json(cartDetails(data, req.user));
});
app.delete('/api/cart/:bookId', requireUser, (req, res) => {
  const data = readStore(); delete (data.carts[req.user] ||= {})[req.params.bookId];
  writeStore(data); res.json(cartDetails(data, req.user));
});
app.post('/api/orders', requireUser, (req, res) => {
  const data = readStore(); const cart = cartDetails(data, req.user);
  if (!cart.items.length) return res.status(400).json({ message: 'Your cart is empty.' });
  const order = { id: `ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`, userId: req.user, items: cart.items, total: cart.total, status: 'Confirmed', createdAt: new Date().toISOString() };
  data.orders.unshift(order); data.carts[req.user] = {}; writeStore(data); res.status(201).json({ order });
});
app.get('/api/orders', requireUser, (req, res) => res.json({ orders: readStore().orders.filter((order) => order.userId === req.user) }));
app.use('/api', (_req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  const index = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(200).send('Book Haven API is running. Start the React dev server with npm run dev.');
});
app.listen(PORT, () => console.log(`Book Haven is running at http://localhost:${PORT}`));
