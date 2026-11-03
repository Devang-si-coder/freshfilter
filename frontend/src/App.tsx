import React,{ useMemo, useState } from 'react';
import {
  ArrowDownUp, ArrowRight, Check, ChevronDown, Heart,
  Leaf, Search, ShoppingBag, SlidersHorizontal, Sparkles,
  Sprout, X,
} from 'lucide-react'
import './App.css'
import {
  fetchProducts,
  registerUser,
  loginUser,
  googleLoginUser,
  getCurrentUser,
  logoutUser,
  fetchFavorites,
  addFavorite,
  removeFavorite,
  fetchShoppingList,
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  type ShoppingItem,
  type User,
} from "./api";

import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import {useEffect} from "react";

type Product = {
  id: string;
  name: string;
  brand: string;
  price: number | null;
  category: string;
  unit: string;
  emoji: string;
  color: string;
  ingredients: string[];
  ingredients_text: string;
  diet: string[];
  protein: number | null;
  sugar: number | null;
  calories: number | null;
  image: string | null;
  badge: string | null;
}


const categories = [
  { name: 'All groceries', emoji: '🛍️' },
  { name: 'Breakfast', emoji: '🥣' },
  { name: 'Snacks', emoji: '🥜' },
  { name: 'Dairy alternatives', emoji: '🥛' },
  { name: 'Spreads', emoji: '🍯' },
  { name: 'Bakery', emoji: '🍞' },
]

const includes = [
  'oats',
  'almonds',
  'peanuts',
  'chickpeas',
  'lentils',
  'chia seeds',
  'flax seeds',
  'soy',
  'whole wheat',
  'brown rice',
  'quinoa',
  'dates',
  'milk',
  'yogurt',
]

const excludes = [
  'sugar',
  'salt',
  'wheat',
  'honey',
  'palm oil',
  'artificial sweeteners',
  'artificial colours',
  'maltodextrin',
  'hydrogenated oils',
  'preservatives',
  'high fructose corn syrup',
]

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showProfile, setShowProfile] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => logoutUser())
      .finally(() => setAuthLoading(false));
  }, []);
  useEffect(() => {
  if (!user) {
    setFavorites([]);
    return;
  }

  fetchFavorites()
    .then((items) => {
      setFavorites(items.map((item) => item.product_id));
    })
    .catch((error) => {
      console.error("Could not load favorites:", error);
    });
}, [user]);

  async function handleRegister(
  name: string,
  email: string,
  password: string
) {
  await registerUser(name, email, password);
  const loggedInUser = await loginUser(email, password);
  setUser(loggedInUser);
  setIsGuest(false);
}

async function handleLogin(email: string, password: string) {
  const loggedInUser = await loginUser(email, password);
  setUser(loggedInUser);
  setIsGuest(false);
}

async function handleGoogleLogin(credential: string) {
  const loggedInUser = await googleLoginUser(credential);
  setUser(loggedInUser);
  setIsGuest(false);
}

function handleGuestLogin() {
  setIsGuest(true);
}

  function handleLogout() {
    logoutUser();
    setUser(null);
    setShowProfile(false);
    setAuthMode("login");
  }
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All groceries')
  const [include, setInclude] = useState<string[]>([])
  const [exclude, setExclude] = useState<string[]>([])
  const [diet, setDiet] = useState('')
  const [maxPrice, setMaxPrice] = useState(300)
  const [minProtein, setMinProtein] = useState(0)
  const [maxSugar, setMaxSugar] = useState(100)
  const [sort, setSort] = useState('featured')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [favorites, setFavorites] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  
  useEffect(() => {
  fetchProducts()
    .then((data) => setProducts(data))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);
console.log("Products received:", products.length);
console.log("Products data:", products);
console.log("Loading:", loading);
console.log("Error:", error);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim()
    return products.filter((p) => {
      const text = [
        p.name, p.brand, p.category, ...p.ingredients, ...p.diet,
      ].join(' ').toLowerCase()

      return (
        (!query || text.includes(query)) &&
        (category === 'All groceries' || p.category === category) &&
        (p.price === null || p.price <= maxPrice) &&
        p.protein >= minProtein &&
        p.sugar <= maxSugar &&
        (!diet || p.diet.includes(diet)) &&
        include.every((i) => p.ingredients.includes(i)) &&
        !exclude.some((i) => p.ingredients.includes(i))
      )
    }).sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price
      if (sort === 'price-high') return b.price - a.price
      if (sort === 'protein') return b.protein - a.protein
      return a.id.localeCompare(b.id)
    })
  }, [search, category, include, exclude, diet, maxPrice, minProtein, maxSugar, sort])

  const cartCount = Object.values(cart).reduce((sum, n) => sum + n, 0)
  const cartTotal = products.reduce(
  (sum, p) => sum + (p.price ?? 0) * (cart[p.id] || 0),
  0,
  )

  function toggleFilter(
    value: string, selected: string[],
    setter: (v: string[]) => void,
  ) {
    setter(selected.includes(value)
      ? selected.filter((x) => x !== value)
      : [...selected, value])
  }
  async function handleToggleFavorite(
  productId: string,
  productName: string
) {
  const isFavorite = favorites.includes(productId);

  try {
    if (isFavorite) {
      await removeFavorite(productId);
      setFavorites((old) =>
        old.filter((id) => id !== productId)
      );
    } else {
      await addFavorite(productId, productName);
      setFavorites((old) => [...old, productId]);
    }
  } catch (error) {
    console.error("Favorite update failed:", error);
    alert("Could not update favorite. Please try again.");
  }
}

  function resetFilters() {
    setSearch('')
    setCategory('All groceries')
    setInclude([])
    setExclude([])
    setDiet('')
    setMaxPrice(300)
    setMinProtein(0)
    setMaxSugar(100)
  }

  if (authLoading) {
    return <div className="auth-container">Loading FreshFilter...</div>;
  }

  if (!user && !isGuest) {
    return (
      <div className="auth-container">
        {authMode === "login" ? (
          <Login
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            onSwitchToRegister={() => setAuthMode("register")}
          />
        ) : (
          <><Register
              onRegister={handleRegister}
              onSwitchToLogin={() => setAuthMode("login")} /><button onClick={handleGuestLogin}>Continue as Guest</button></>
        )}
      </div>
    );
  }

  if (showProfile) {
    return (
      <Profile
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="announcement">
        <Sprout size={15} />
        GOOD FOOD. BETTER CHOICES.
        <span>Thoughtful shopping starts here.</span>
      </div>

      <header className="navbar">
        <a href="#" className="brand">
          <span className="brand-icon"><Leaf size={22} /></span>
          <span>fresh<span className="brand-light">filter</span><small>GROCERIES, REIMAGINED</small></span>
        </a>

        <nav className="nav-links">
          <a href="#shop">Shop all</a>
          <a href="#filters">Ingredient finder</a>
          <a href="#why">Our promise</a>
        </nav>

        <div className="nav-actions">
        <button
            className="icon-button"
            aria-label="Favorites"
            onClick={() => {
            document.getElementById("shop")?.scrollIntoView();
          }}
          >
        <Heart size={20} />
        <span className="favorite-count">{favorites.length || ''}</span>
        </button>

      {user ? (
        <button
          className="cart-button"
          onClick={() => setShowProfile(true)}
        >
        <span>👤</span>
        <span>My Account</span>
        </button>
        ) : (
        <button
          className="cart-button"
          onClick={() => {
            setIsGuest(false);
            setAuthMode("login");
          }}
          >
          Sign in
          </button>
          )}
          {user && (
          <button
            className="cart-button"
            onClick={() =>
            window.alert(
            "Demo cart: " + cartCount + " items. Checkout comes in Stage 3."
          )
        }
          >       
          <ShoppingBag size={18} />
          <span>My basket</span>
          <b>{cartCount}</b>
          </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> SHOP WITH INTENTION</div>
            <h1>Know what's in<br />your <span>food.</span></h1>
            <p>
              Groceries that fit your ingredients, your goals,
              and your everyday life. Find your kind of good.
            </p>
            <a className="primary-button" href="#shop">
              Find your groceries <ArrowRight size={17} />
            </a>
            <div className="hero-trust">
              <span><Check size={15} /> Ingredient-first discovery</span>
              <span><Check size={15} /> Choices made clearer</span>
            </div>
          </div>

          <div className="hero-art">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-note note-top">
              <span>🌿</span><div><b>Your ingredients.</b><small>Your rules.</small></div>
            </div>
            <div className="hero-produce">
              <div className="produce produce-avocado">🥑</div>
              <div className="produce produce-orange">🍊</div>
              <div className="produce produce-leaf">🥬</div>
              <div className="produce produce-tomato">🍅</div>
              <div className="produce produce-pear">🍐</div>
            </div>
            <div className="hero-note note-bottom">
              <span className="note-check"><Check size={16} /></span>
              <div><b>A little more mindful.</b><small>Every single shop.</small></div>
            </div>
            <span className="hero-spark spark-one">✳️</span>
            <span className="hero-spark spark-two">✳️</span>
          </div>

          <div className="hero-bottom-label">A FRESHER WAY TO FILL YOUR BASKET <span>✳️</span></div>
        </section>

        <section className="benefits" id="why">
          <div><span className="benefit-icon">🌱</span><span><b>Ingredient aware</b><small>Know what goes in.</small></span></div>
          <div><span className="benefit-icon">♡</span><span><b>Made for your needs</b><small>Shop your way.</small></span></div>
          <div><span className="benefit-icon">⌁</span><span><b>Mindful choices</b><small>Compare with clarity.</small></span></div>
          <div><span className="benefit-icon">✳️</span><span><b>Everyday essentials</b><small>Goodness, made simple.</small></span></div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div>
              <div className="eyebrow">YOUR PANTRY, YOUR WAY</div>
              <h2>Find your kind of <span>good.</span></h2>
              <p>Good ingredients. Clear choices. No guesswork.</p>
            </div>
            <div className="product-count">{filtered.length} products to explore</div>
          </div>

          <div className="search-box">
            <Search size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Try “high protein snacks” or search an ingredient..."
              aria-label="Search groceries and ingredients"
            />
            {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={18}/></button>}
            <button className="search-submit" onClick={() => document.getElementById('shop')?.scrollIntoView()}>
              Find food
            </button>
          </div>

          <div className="category-row">
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => setCategory(c.name)}
                className={`category-chip ${category === c.name ? 'active' : ''}`}
              >
                <span>{c.emoji}</span>{c.name}
              </button>
            ))}
          </div>

          <div className="catalog-layout">
            <aside className={`filter-panel ${showFilters ? 'filters-open' : ''}`} id="filters">
              <div className="filter-title">
                <span><SlidersHorizontal size={18} /> Find your fit</span>
                <button onClick={resetFilters}>Reset</button>
              </div>

              <div className="filter-group">
                <h3>Include ingredients</h3>
                <p className="filter-help">Must contain every selected ingredient.</p>
                {includes.map((item) => (
                  <label className="filter-option" key={item}>
                    <input type="checkbox" checked={include.includes(item)}
                      onChange={() => toggleFilter(item, include, setInclude)} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>

              <div className="filter-group">
                <h3>Exclude ingredients</h3>
                <p className="filter-help">Hide products containing these ingredients.</p>
                {excludes.map((item) => (
                  <label className="filter-option" key={item}>
                    <input type="checkbox" checked={exclude.includes(item)}
                      onChange={() => toggleFilter(item, exclude, setExclude)} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>

              <div className="filter-group">
                <h3>Dietary preference</h3>
                <select value={diet} onChange={(e) => setDiet(e.target.value)}>
                  <option value="">All preferences</option>
                  <option value="vegan">Vegan</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="gluten-free*">Gluten-free (sample tag)</option>
                </select>
                <p className="filter-help">Dietary tags in this demo are illustrative, not verified certifications.</p>
              </div>

              <div className="filter-group">
                <div className="range-heading"><h3>Maximum price</h3><b>₹{maxPrice}</b></div>
                <input className="range-input" type="range" min="50" max="300" step="10"
                  value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
                <div className="range-labels"><span>₹50</span><span>₹300</span></div>
              </div>

              <div className="filter-group">
                <div className="range-heading"><h3>Minimum protein</h3><b>{minProtein} g</b></div>
                <input className="range-input" type="range" min="0" max="25" step="1"
                  value={minProtein} onChange={(e) => setMinProtein(Number(e.target.value))} />
                <div className="range-labels"><span>Any</span><span>25 g+</span></div>
                <p className="filter-help">Per 100 g, using sample values.</p>
              </div>

              <div className="filter-group">
                <div className="range-heading"><h3>Maximum sugar</h3><b>{maxSugar} g</b></div>
                <input className="range-input" type="range" min="0" max="100" step="5"
                  value={maxSugar} onChange={(e) => setMaxSugar(Number(e.target.value))} />
                <div className="range-labels"><span>0 g</span><span>100 g</span></div>
                <p className="filter-help">Per 100 g, using sample values.</p>
              </div>
            </aside>

            <div className="catalog">
              <div className="catalog-toolbar">
                <button className="mobile-filter-button" onClick={() => setShowFilters(!showFilters)}>
                  <SlidersHorizontal size={16} /> Filters
                  <ChevronDown size={15} />
                </button>
                <span className="results-label">Showing <b>{filtered.length}</b> results</span>
                <label className="sort-select">
                  <ArrowDownUp size={15} />
                  <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="protein">Highest protein</option>
                  </select>
                </label>
              </div>

              {filtered.length > 0 ? (
                <div className="product-grid">
                  {filtered.map((p) => (
                    <article className="product-card" key={p.id}>
                      <div className="product-art" style={{ background: p.color }}>
                        {p.badge && <span className="product-badge">{p.badge}</span>}

                        {user && (
                          <button
                          className={`favorite-button ${favorites.includes(p.id) ? 'is-favorite' : ''}`}
                          aria-label={favorites.includes(p.id) ? 'Remove favorite' : 'Add favorite'}
                          onClick={() => handleToggleFavorite(p.id, p.name)}
                        >
                        
                          <Heart size={17} fill={favorites.includes(p.id) ? 'currentColor' : 'none'} />
                        </button>
                        )}
                        {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="product-image"
                          onError={(e) => {
                          e.currentTarget.style.display = "none";
                          }}
                        />
                        ) : (
                        <span className="product-emoji">{p.emoji || "🛒"}</span>
                        )}
                        <span className="product-art-caption">FRESHFILTER FINDS</span>
                      </div>
                      <div className="product-info">
                        <div className="product-brand">{p.brand}</div>
                        <h3>{p.name}</h3>
                        <div className="product-unit">{p.unit} · {p.protein} g protein / 100 g</div>
                        <div className="product-tags">
                          {p.diet.slice(0, 2).map((tag) => <span key={tag}>{tag.replace('*', '')}</span>)}
                        </div>
                        <div className="product-footer">
                          <div>
                          <b>{p.price != null ? "₹" + p.price : "Price unavailable"}</b>
                          <small>
                            {p.price != null ? "Retail price" : "No verified price available"}
                          </small>
                          </div>
                          {user ? (
                          <button
                            className={`add-button ${cart[p.id] ? 'added' : ''}`}
                            onClick={() =>
                            setCart((old) => ({
                              ...old,
                            [p.id]: (old[p.id] || 0) + 1,
                            }))
                          }
                          >
                            {cart[p.id] ? (
                          <>
                          <Check size={16} /> {cart[p.id]}
                          </>
                          ) : (
                          <>
                          <span>+</span> Add
                          </>
                          )}
                          </button>
                        ) : (
                          <span className="product-unit">Guest browsing</span>
                        )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>🥑</span>
                  <h3>No matching groceries yet</h3>
                  <p>Try removing an ingredient or relaxing a filter.</p>
                  <button className="primary-button" onClick={resetFilters}>Clear all filters</button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="promise-banner">
          <div className="promise-icon"><Sprout size={26} /></div>
          <div><div className="eyebrow">A SMALLER STEP. A BETTER CHOICE.</div>
            <h2>Good food starts with <span>knowing.</span></h2>
            <p>We're making it easier to discover food that fits your life.</p>
          </div>
          <a href="#shop">Explore the pantry <ArrowRight size={16} /></a>
        </section>
      </main>

      <footer className="footer">
        <a href="#" className="brand footer-brand"><span className="brand-icon"><Leaf size={20}/></span><span>fresh<span className="brand-light">filter</span><small>GROCERIES, REIMAGINED</small></span></a>
        <p>Shop with intention. Choose with confidence.</p>
        <span>© 2026 FreshFilter · Demo storefront</span>
      </footer>

      <div className="mobile-basket">
        <ShoppingBag size={18}/>
        <span>{cartCount} items · ₹{cartTotal}</span>
        <button onClick={() => alert(`Demo cart total: ₹${cartTotal}. Checkout comes in Stage 3.`)}>View basket</button>
      </div>
    </div>
  )
}

export default App