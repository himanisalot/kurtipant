// products.js
// Single source of truth for what's sold on the page.
// Prices here are for DISPLAY only — the real price is enforced again,
// server-side, in netlify/functions/create-order.js. Keep both in sync.

const SIZES = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl'];

const KURTIS = [
  { id: 'kurti-purple', type: 'kurti', color: 'purple', label: 'Orchid Purple Kurti', price: 1650, img: 'assets/kurti-purple.jpg' },
  { id: 'kurti-orange', type: 'kurti', color: 'orange', label: 'Rust Orange Kurti',   price: 1650, img: 'assets/kurti-orange.jpg' },
  { id: 'kurti-green',  type: 'kurti', color: 'green',  label: 'Olive Green Kurti',   price: 1650, img: 'assets/kurti-green.jpg' },
  { id: 'kurti-pink',   type: 'kurti', color: 'pink',   label: 'Dusty Pink Kurti',    price: 1650, img: 'assets/kurti-pink.jpg' },
  { id: 'kurti-blue',   type: 'kurti', color: 'blue',   label: 'Cobalt Blue Kurti',   price: 1650, img: 'assets/kurti-blue.jpg' },
];

const EXTRAS = [
  { id: 'pant',  type: 'pant',  color: null, label: 'Palazzo Pant',          price: 950,  img: 'assets/kurti-purple.jpg', note: 'Pairs with any kurti above' },
  { id: 'combo', type: 'combo', color: null, label: 'Kurti + Pant Combo',     price: 2500, img: 'assets/kurti-blue.jpg',  note: 'Choose your kurti colour at checkout' },
];
