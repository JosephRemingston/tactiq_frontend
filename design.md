# Recreate this section: Simple Pricing 2

You are an expert front-end developer. Produce a **single self-contained `index.html`** that
renders the section below **exactly** as specified — same layout, styles, typography, colors,
copy, responsive behaviour and interactions. No build step, no framework, no external CSS/JS
(inline everything; the only remote request is the Google Fonts named below). Hardcode every value
given here as fixed constants.

## What it is

A centred, white **two-plan pricing block** with heavy Inter Tight display type. Two faint
wireframe glyphs (clusters of outlined rounded squares) float at the top-left and mirrored
top-right. Header: a small white uppercase eyebrow pill with a document icon ("PRICING PAGE"), a
huge 800-weight two-line headline "Our pricing is simple / with no hidden fees", a muted lede, then
a **Month · toggle · Yearly** switch — a dark 52×29 track with a pearly knob that springs across —
over a small "(GET 30% OFF)" note. Below, a two-up grid: a **light Free card** (white, hairline
border) and a **dark Premium card** (`#0c1112`) lit by a **lime corner glow** rising from its
bottom-left, with a lime price and a lime gradient CTA carrying a round chevron. Each card splits
into a price column (tag pill, big price, period line) and a feature column (title + check list),
with a full-width CTA at the bottom. Toggling the billing period **cross-fades every price and
period line in place** (fade + 6px rise); it starts on Yearly. The whole block settles in on load
(fade + 12px rise); cards lift 4px on hover.

## Layout & structure

`<section id="section">` (full height, column, centred) holds the two absolutely placed `.deco`
glyphs, `header.head` (eyebrow, `h2#title` with two `span.l` lines — the last phrase wrapped in
`span.hl` — lede, `.switch` with two label buttons around `button.track[role=switch]`, and
`p.note`) and `.plans`, a 2-column grid (max 986px). Each `article.card` (`-light` / `-dark`) =
`.body` (two `.col`s: tag + `.amount` + `.period`; `.feat-h` + `ul`) + `.cta-gap` + `button.cta`.
All content is built by the script.

```html
<section id="section" aria-labelledby="title">
  <div class="deco -l" aria-hidden="true"></div>
  <div class="deco -r" aria-hidden="true"></div>

  <header class="head">
    <span class="eyebrow" id="eyebrow"></span>
    <h2 id="title"></h2>
    <p class="lede" id="lede"></p>

    <div class="switch">
      <button class="lbl" id="lblMonth" type="button"></button>
      <button class="track" id="track" type="button" role="switch" aria-checked="true" aria-label="Billing period">
        <span class="knob"></span>
      </button>
      <button class="lbl" id="lblYear" type="button"></button>
    </div>
    <p class="note" id="note"></p>
  </header>

  <div class="plans" id="plans" role="list"></div>
</section>
```

## Styles

Use this CSS verbatim. Palette: bg `#ffffff`, ink `#0b0d0e`, muted `#8b9096`, faint `#adb2b7`,
line `#ececec`; light card `#ffffff` / border `#efefef`, tag `#e9ebec` / `#141719`, list
`#4a5054`, period `#9aa0a5`; dark card `#0c1112`, ink `#f2f5f6`, list `#dfe4e6`, period
`#a9b0b3`; lime `#cdf348`, deep lime `#a9dd28`; deco strokes `#efefef`. Glow strength 0.62. The
size ladder is a set of per-breakpoint step vars (`--h1-lg/-md/-sm/-ms/-xs`, `--price-*`,
`--pad-*`, …) that the script writes inline; the live vars (`--h1`, `--price`, …) are plain
stylesheet declarations that the media queries re-point, so the ladder responds even though its
values come from script. The headline is `min(--h1, 8.2vw)`.

```css
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:#fff}

#section{
  --bg:#ffffff;
  --ink:#0b0d0e;
  --muted:#8b9096;
  --faint:#adb2b7;
  --line:#ececec;

  --card:#ffffff;
  --card-line:#efefef;
  --pill:#e9ebec;
  --pill-ink:#141719;
  --list:#4a5054;
  --period:#9aa0a5;

  --dark:#0c1112;
  --dark-ink:#f2f5f6;
  --dark-list:#dfe4e6;
  --dark-period:#a9b0b3;

  --lime:#cdf348;
  --lime-deep:#a9dd28;
  --deco:#efefef;

  /* JS writes the *-lg / *-md / *-sm / *-xs steps inline from CONFIG.layout;
     the live vars below are plain stylesheet declarations so @media can retune them. */
  --h1-lg:92px;   --h1-md:78px;   --h1-sm:52px;   --h1-ms:40px;  --h1-xs:32px;   --h1-vw:8.2;
  --price-lg:54px;                --price-sm:46px; --price-xs:36px;
  --radius-lg:24px;                                --radius-xs:20px;
  --pad-lg:36px;                  --pad-sm:28px;  --pad-xs:24px;
  --gap-lg:22px;                  --gap-sm:16px;
  --maxw-lg:986px; --maxw-md:900px; --maxw-sm:720px;
  --cardh-lg:300px;

  --h1:var(--h1-lg);
  --price:var(--price-lg);
  --radius:var(--radius-lg);
  --pad:var(--pad-lg);
  --gap:var(--gap-lg);
  --maxw:var(--maxw-lg);
  --cardh:var(--cardh-lg);
  --glow:0.62;
  --fade:280;

  position:relative;
  min-height:100svh;
  width:100%;
  overflow-x:clip;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  padding:76px 24px 84px;
  background:var(--bg);
  color:var(--ink);
  font:400 16px/1.5 'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}

/* ── decorative wireframe glyphs ───────────────────────────────── */
#section .deco{position:absolute;top:11%;width:178px;color:var(--deco);pointer-events:none;z-index:0}
#section .deco svg{display:block;width:100%;height:auto}
#section .deco.-l{left:2.5%}
#section .deco.-r{right:2.5%;transform:scaleX(-1)}

/* ── head ──────────────────────────────────────────────────────── */
#section .head{position:relative;z-index:1;width:100%;max-width:var(--maxw);margin:0 auto;text-align:center;display:flex;flex-direction:column;align-items:center}

#section .eyebrow{
  display:inline-flex;align-items:center;gap:7px;
  height:30px;padding:0 14px;border-radius:999px;
  background:#fff;border:1px solid var(--line);
  box-shadow:0 6px 16px -10px rgba(0,0,0,.28),0 1px 2px rgba(0,0,0,.04);
  font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#2c3033;
}
#section .eyebrow svg{width:12px;height:12px;display:block;color:#2c3033;flex:none}

#section h2{
  margin:22px 0 0;
  font-family:'Inter Tight',ui-sans-serif,system-ui,sans-serif;
  /* --h1-vw is a viewport-width safety cap: never binds on the tuned steps above,
     but keeps the headline from spilling on very narrow phones. */
  font-size:min(var(--h1), calc(var(--h1-vw) * 1vw));
  line-height:1.0;
  font-weight:800;
  letter-spacing:-.042em;
  color:var(--ink);
}
#section h2 .l{display:block}
#section h2 .l+.l{margin-top:.06em}
#section .hl{
  display:inline;
  vertical-align:baseline;
}

#section .lede{margin:22px 0 0;font-size:15.5px;line-height:1.55;color:var(--muted);max-width:54ch}

/* ── switch ────────────────────────────────────────────────────── */
#section .switch{margin:44px 0 0;display:flex;align-items:center;gap:14px}
#section .switch .lbl{
  background:none;border:0;padding:0;cursor:pointer;font:inherit;
  font-size:15px;font-weight:600;color:var(--ink);
  transition:opacity .25s ease,color .25s ease;
}
#section .switch .lbl[data-off]{opacity:.45;font-weight:500}
#section .track{
  position:relative;width:52px;height:29px;flex:none;
  border:0;padding:0;cursor:pointer;border-radius:999px;
  background:#1b1f21;
  box-shadow:0 8px 18px -12px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.09);
}
#section .track:focus-visible{outline:2px solid var(--lime-deep);outline-offset:3px}
#section .knob{
  position:absolute;top:3.5px;left:3.5px;width:22px;height:22px;border-radius:50%;
  background:radial-gradient(120% 120% at 34% 26%,#ffffff,#dcdcdc 66%,#c6c6c6);
  box-shadow:0 2px 5px rgba(0,0,0,.42);
  transition:transform .28s cubic-bezier(.4,1.35,.5,1);
}
#section .track[aria-checked="true"] .knob{transform:translateX(23px)}
#section .note{margin:13px 0 0;font-size:10.5px;font-weight:600;letter-spacing:.08em;color:var(--faint);transition:opacity .25s ease}

/* ── plans ─────────────────────────────────────────────────────── */
#section .plans{
  position:relative;z-index:1;
  margin:40px auto 0;width:100%;max-width:var(--maxw);
  display:grid;grid-template-columns:1fr 1fr;gap:var(--gap);
}

#section .card{
  position:relative;isolation:isolate;overflow:hidden;
  min-height:var(--cardh);
  padding:calc(var(--pad) - 6px) var(--pad) calc(var(--pad) - 10px);
  border-radius:var(--radius);
  display:flex;flex-direction:column;
  transition:transform .35s cubic-bezier(.2,.8,.3,1),box-shadow .35s ease;
}
#section .card.-light{
  background:var(--card);border:1px solid var(--card-line);
  box-shadow:0 24px 48px -30px rgba(0,0,0,.24),0 2px 6px -4px rgba(0,0,0,.05);
}
#section .card.-dark{
  background:var(--dark);color:var(--dark-ink);
  box-shadow:0 28px 56px -30px rgba(0,0,0,.55);
}
#section .card.-dark::before{
  content:"";position:absolute;inset:0;z-index:-1;
  background:
    radial-gradient(86% 78% at 0% 108%,
      rgba(205,243,72,var(--glow)) 0%,
      rgba(205,243,72,calc(var(--glow)*.34)) 40%,
      rgba(205,243,72,0) 70%),
    radial-gradient(58% 62% at 56% 122%,
      rgba(205,243,72,calc(var(--glow)*.30)) 0%,
      rgba(205,243,72,0) 72%);
}
#section .card:hover{transform:translateY(-4px)}
#section .card.-light:hover{box-shadow:0 34px 60px -30px rgba(0,0,0,.28),0 2px 6px -4px rgba(0,0,0,.05)}
#section .card.-dark:hover{box-shadow:0 38px 66px -30px rgba(0,0,0,.6)}

#section .body{display:grid;grid-template-columns:1fr 1.12fr;gap:22px;align-items:start}

#section .tag{
  display:inline-flex;align-items:center;gap:7px;height:26px;padding:0 12px;border-radius:999px;
  font-size:9.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap;
}
#section .-light .tag{background:var(--pill);color:var(--pill-ink)}
#section .-dark .tag{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#eef3f4}
#section .tag svg{width:11px;height:11px;display:block;flex:none}
#section .-dark .tag svg{color:#fff}

#section .amount{
  margin:28px 0 0;
  font-family:'Inter Tight',ui-sans-serif,system-ui,sans-serif;
  font-size:var(--price);line-height:1;font-weight:800;letter-spacing:-.036em;
  min-height:1em;
  transition:opacity .22s ease,transform .22s ease;
}
#section .-light .amount{color:var(--ink)}
#section .-dark .amount{color:var(--lime);text-shadow:0 0 36px rgba(205,243,72,.3)}
#section .period{margin:17px 0 0;font-size:14px;line-height:1.4;transition:opacity .22s ease,transform .22s ease}
#section .-light .period{color:var(--period)}
#section .-dark .period{color:var(--dark-period)}
#section .amount.-swap,#section .period.-swap{opacity:0;transform:translateY(-6px)}

#section .feat-h{margin:1px 0 0;font-size:16px;line-height:1.3;font-weight:600;letter-spacing:-.01em}
#section .-light .feat-h{color:#15191b}
#section .-dark .feat-h{color:var(--dark-ink)}
#section ul{list-style:none;margin:19px 0 0;padding:0;display:flex;flex-direction:column;gap:17px}
#section li{display:flex;align-items:center;gap:11px;font-size:14.5px;line-height:1.2}
#section .-light li{color:var(--list)}
#section .-dark li{color:var(--dark-list)}
#section li svg{width:18px;height:18px;flex:none;display:block}
#section .-light li svg{color:#151a1c}
#section .-dark li svg{color:#ffffff}

#section .cta{
  margin-top:auto;position:relative;display:flex;align-items:center;justify-content:center;
  width:100%;height:46px;padding:0 22px;border:0;border-radius:12px;cursor:pointer;
  font:inherit;font-size:14.5px;font-weight:600;letter-spacing:-.005em;
  transition:transform .25s ease,filter .25s ease,box-shadow .25s ease;
}
#section .cta-gap{height:34px;flex:none}
#section .-light .cta{background:#0d1214;color:#fff;box-shadow:0 14px 26px -16px rgba(0,0,0,.8)}
#section .-dark .cta{
  background:linear-gradient(100deg,var(--lime-deep) 0%,var(--lime) 52%,#dffb72 100%);
  color:#101a05;box-shadow:0 14px 34px -16px rgba(190,240,60,.75);
}
#section .cta:hover{transform:translateY(-2px);filter:brightness(1.07)}
#section .-light .cta:hover{filter:brightness(1.4)}
#section .cta:focus-visible{outline:2px solid var(--lime-deep);outline-offset:3px}
#section .cta .chev{
  position:absolute;right:7px;top:50%;transform:translateY(-50%);
  width:32px;height:32px;border-radius:50%;
  background:rgba(12,18,4,.07);
  border:1px solid rgba(12,18,4,.28);
  display:flex;align-items:center;justify-content:center;
}
#section .cta .chev svg{width:12px;height:12px;display:block}

/* settle-in, well under 1s */
#section .head,#section .plans,#section .deco{animation:glRise .5s cubic-bezier(.2,.8,.3,1) both}
#section .plans{animation-delay:.08s}
@keyframes glRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
#section .deco.-r{animation-name:glRiseR}
@keyframes glRiseR{from{opacity:0;transform:scaleX(-1) translateY(12px)}to{opacity:1;transform:scaleX(-1)}}

/* ── responsive ────────────────────────────────────────────────── */
@media (max-width:1180px){
  #section{--maxw:var(--maxw-md);--h1:var(--h1-md)}
  #section .deco{width:140px;opacity:.9}
}
@media (max-width:1024px){
  #section{padding:64px 20px 70px;--h1:var(--h1-sm);--price:var(--price-sm);--pad:var(--pad-sm);--gap:var(--gap-sm);--cardh:auto;--maxw:var(--maxw-sm)}
  #section .deco{display:none}
  #section .body{grid-template-columns:1fr 1.05fr;gap:18px}
  #section .amount{margin-top:22px}
  #section .cta-gap{height:28px}
}
/* Phone territory: the grid stacks here, so the headline drops to its mobile step
   instead of holding the tablet size all the way down to 640px. */
@media (max-width:760px){
  #section{--h1:var(--h1-ms)}
  #section h2{letter-spacing:-.034em}
  #section .plans{grid-template-columns:1fr;max-width:520px;gap:16px}
}
@media (max-width:640px){
  #section{padding:52px 16px 60px;--h1:var(--h1-xs);--price:var(--price-xs);--radius:var(--radius-xs);--pad:var(--pad-xs)}
  #section h2{letter-spacing:-.03em}
  #section .lede{font-size:14.5px;margin-top:16px}
  #section .switch{margin-top:34px}
  #section .plans{margin-top:30px}
  #section .body{grid-template-columns:1fr;gap:24px}
  #section .amount{margin-top:20px}
  #section .period{margin-top:12px}
  #section ul{margin-top:15px;gap:15px}
  #section .cta-gap{height:24px}
  #section .cta{height:50px}
}
@media (prefers-reduced-motion:reduce){
  #section *,#section *::before,#section *::after{transition:none!important;animation:none!important}
}
```

## Fixed parameters (bake these in)

- Layout — `h1 92`, `price 54`, `radius 24`, `pad 36`, `gap 22`, `maxw 986`, `cardh 300`,
  `glow 0.62`, `fade 280` (swap delay = `max(60, fade × 0.55)` ms), `h1Vw 8.2`.
- Steps — md (≤1180): h1 78, maxw 900 · sm (≤1024): h1 52, price 46, pad 28, gap 16, maxw 720 ·
  ms (≤760): h1 40 · xs (≤640): h1 32, price 36, radius 20, pad 24.
- Starts on **Yearly**.
- Copy — eyebrow `Pricing Page`; title `Our pricing is simple` / `with no` + `hidden fees`;
  lede `Lorem Ipsum has been the industry's standard dummy text ever.`; labels `Month` /
  `Yearly`; note `(GET 30% OFF)`.
- Free (light) — tag `Free Plan`; `$0` / `$0`; period `Per member, per monthly` / `Per member,
  per yearly`; `Free Elements:` ×3 `Lorem ipsum dolor`; CTA `Start for Free`.
- Premium (dark) — tag `Premium` + ⌘ icon; `$92.99` monthly / `$64.99` yearly; same period lines;
  `Free Elements:` ×3 `Lorem ipsum dolor`; CTA `Get Started` with chevron disc.

## Behaviour & interaction

Put this at the end of `<body>` in a plain `<script>`, verbatim. It writes the colour vars and the
size-step vars, renders the header, decos and cards, and paints prices for the current period.
`setPeriod(v)` flips the period and calls `paintPrices(true)`: price and period lines get `.-swap`,
are rewritten after the half-fade and fade back; the inactive label dims (`data-off`), the note
dims to .4 on Month, and the track's `aria-checked` drives the knob. Triggers: clicking the track
(toggle) or either label; ←/→ on the track or anywhere on the page (Left = Month, Right = Yearly)
unless typing in a field; a horizontal swipe on the section over 55px (and 1.6× more horizontal
than vertical) — swipe left = Yearly, right = Month. Reduced motion swaps instantly.

```js
/* ────────────────────────────────────────────────────────────────
   CONFIG — every colour, size and word in this section.
   ──────────────────────────────────────────────────────────────── */
const CONFIG = {
  colors: {
    bg:'#ffffff', ink:'#0b0d0e', muted:'#8b9096', faint:'#adb2b7', line:'#ececec',
    card:'#ffffff', cardLine:'#efefef', pill:'#e9ebec', pillInk:'#141719',
    list:'#4a5054', period:'#9aa0a5',
    dark:'#0c1112', darkInk:'#f2f5f6', darkList:'#dfe4e6', darkPeriod:'#a9b0b3',
    lime:'#cdf348', limeDeep:'#a9dd28', deco:'#efefef'
  },
  layout: {
    h1:92, price:54, radius:24, pad:36, gap:22, maxw:986, cardh:300, glow:0.62, fade:280,
    /* h1Vw = headline cap in vw units, applied at every width as a spill guard. */
    h1Vw:8.2,
    /* Step-downs per breakpoint — the responsive ladder is tunable here rather than
       hard-coded in the @media blocks. md ≤1180px, sm ≤1024px, ms ≤760px (the width
       where the plan grid stacks — phone-sized headline starts here), xs ≤640px. */
    md: { h1:78, maxw:900 },
    sm: { h1:52, price:46, pad:28, gap:16, maxw:720 },
    ms: { h1:40 },
    xs: { h1:32, price:36, radius:20, pad:24 }
  },
  yearly: true,
  text: {
    eyebrow:'Pricing Page',
    titleA:'Our pricing is simple',
    titleB:'with no',
    titleHi:'hidden fees',
    lede:"Lorem Ipsum has been the industry's standard dummy text ever.",
    month:'Month',
    yearly:'Yearly',
    note:'(GET 30% OFF)',
    /* Photography placeholders — none are shown in this section's design, but the map is
       kept here so any future portrait/logo slot is swapped in one place. */
    images:{}
  },
  plans: [
    {
      theme:'light', tag:'Free Plan', tagIcon:null,
      priceMonthly:'$0', priceYearly:'$0',
      periodMonthly:'Per member, per monthly', periodYearly:'Per member, per yearly',
      featuresTitle:'Free Elements:',
      features:['Lorem ipsum dolor','Lorem ipsum dolor','Lorem ipsum dolor'],
      cta:'Start for Free', ctaArrow:false
    },
    {
      theme:'dark', tag:'Premium', tagIcon:'cmd',
      priceMonthly:'$92.99', priceYearly:'$64.99',
      periodMonthly:'Per member, per monthly', periodYearly:'Per member, per yearly',
      featuresTitle:'Free Elements:',
      features:['Lorem ipsum dolor','Lorem ipsum dolor','Lorem ipsum dolor'],
      cta:'Get Started', ctaArrow:true
    }
  ]
}

/* ── icons ─────────────────────────────────────────────────────── */
const ICON = {
  page:'<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.1" y="2.1" width="11.8" height="11.8" rx="2.6" fill="currentColor"/><rect x="4.3" y="4.7" width="7.4" height="1.9" rx=".95" fill="#fff"/><rect x="4.3" y="8" width="4.8" height="1.5" rx=".75" fill="#fff" opacity=".72"/></svg>',
  cmd:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/></svg>',
  check:'<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M5.9 10.3 8.6 12.9 14.1 7.4" stroke="var(--tick)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev:'<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.3 1.8 8.5 6l-4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
}

const DECO = '<svg viewBox="0 0 178 236" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">'
  + '<rect x="88" y="1" width="56" height="52" rx="13"/>'
  + '<rect x="30" y="62" width="56" height="52" rx="13"/>'
  + '<rect x="88" y="62" width="56" height="52" rx="13"/>'
  + '<rect x="86" y="124" width="66" height="62" rx="15"/>'
  + '<rect x="18" y="146" width="50" height="46" rx="12"/>'
  + '</svg>'

/* ── vars ──────────────────────────────────────────────────────── */
const root = document.getElementById('section')
function applyVars(){
  const c = CONFIG.colors, l = CONFIG.layout, s = root.style
  s.setProperty('--bg',c.bg);              s.setProperty('--ink',c.ink)
  s.setProperty('--muted',c.muted);        s.setProperty('--faint',c.faint)
  s.setProperty('--line',c.line);          s.setProperty('--card',c.card)
  s.setProperty('--card-line',c.cardLine); s.setProperty('--pill',c.pill)
  s.setProperty('--pill-ink',c.pillInk);   s.setProperty('--list',c.list)
  s.setProperty('--period',c.period);      s.setProperty('--dark',c.dark)
  s.setProperty('--dark-ink',c.darkInk);   s.setProperty('--dark-list',c.darkList)
  s.setProperty('--dark-period',c.darkPeriod)
  s.setProperty('--lime',c.lime);          s.setProperty('--lime-deep',c.limeDeep)
  s.setProperty('--deco',c.deco)
  /* Write the per-breakpoint *steps*, never the live --h1/--price/… vars: an inline
     value would outrank the @media rules and leave phones at desktop sizes. */
  s.setProperty('--h1-lg',l.h1+'px');      s.setProperty('--price-lg',l.price+'px')
  s.setProperty('--radius-lg',l.radius+'px'); s.setProperty('--pad-lg',l.pad+'px')
  s.setProperty('--gap-lg',l.gap+'px');    s.setProperty('--maxw-lg',l.maxw+'px')
  s.setProperty('--cardh-lg',l.cardh+'px')
  s.setProperty('--h1-vw',l.h1Vw)
  ;[['md',l.md],['sm',l.sm],['ms',l.ms],['xs',l.xs]].forEach(function (step) {
    const suffix = '-' + step[0]
    for (const k in step[1]) s.setProperty('--' + k.toLowerCase() + suffix, step[1][k] + 'px')
  })
  s.setProperty('--glow',l.glow); s.setProperty('--fade',l.fade)
  document.body.style.background = c.bg
}

/* ── paint ─────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id)
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)')

function paintStatic(){
  const t = CONFIG.text
  $('eyebrow').innerHTML = ICON.page + '<span>' + t.eyebrow + '</span>'
  $('title').innerHTML =
    '<span class="l">' + t.titleA + '</span>' +
    '<span class="l">' + t.titleB + ' <span class="hl">' + t.titleHi + '</span></span>'
  $('lede').textContent = t.lede
  $('lblMonth').textContent = t.month
  $('lblYear').textContent  = t.yearly
  $('note').textContent = t.note
  document.querySelectorAll('#section .deco').forEach(d => { d.innerHTML = DECO })

  $('plans').innerHTML = CONFIG.plans.map(function (p, i) {
    const dark = p.theme === 'dark'
    const tick = dark ? CONFIG.colors.dark : '#ffffff'
    return '<article role="listitem" class="card ' + (dark ? '-dark' : '-light') + '" style="--tick:' + tick + '" aria-label="' + p.tag + '">' +
      '<div class="body">' +
        '<div class="col">' +
          '<span class="tag">' + p.tag + (p.tagIcon ? ICON[p.tagIcon] : '') + '</span>' +
          '<p class="amount" id="amt' + i + '"></p>' +
          '<p class="period" id="per' + i + '"></p>' +
        '</div>' +
        '<div class="col">' +
          '<p class="feat-h">' + p.featuresTitle + '</p>' +
          '<ul>' + p.features.map(function (f) {
            return '<li>' + ICON.check + '<span>' + f + '</span></li>'
          }).join('') + '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="cta-gap" aria-hidden="true"></div>' +
      '<button class="cta" type="button">' + p.cta +
        (p.ctaArrow ? '<span class="chev" aria-hidden="true">' + ICON.chev + '</span>' : '') +
      '</button>' +
    '</article>'
  }).join('')

  paintPrices(false)
}

function paintPrices(animate){
  const y = !!CONFIG.yearly
  const half = Math.max(60, CONFIG.layout.fade * 0.55)
  CONFIG.plans.forEach(function (p, i) {
    const a = $('amt' + i), pe = $('per' + i)
    if (!a || !pe) return
    const write = function () {
      a.textContent  = y ? p.priceYearly  : p.priceMonthly
      pe.textContent = y ? p.periodYearly : p.periodMonthly
    }
    if (!animate || REDUCED.matches) { write(); return }
    a.classList.add('-swap'); pe.classList.add('-swap')
    setTimeout(function () {
      write()
      a.classList.remove('-swap'); pe.classList.remove('-swap')
    }, half)
  })
  $('lblMonth').toggleAttribute('data-off', y)
  $('lblYear').toggleAttribute('data-off', !y)
  $('note').style.opacity = y ? '1' : '.4'
  $('track').setAttribute('aria-checked', String(y))
}

/* ── interaction ───────────────────────────────────────────────── */
function setPeriod(v){
  if (v === CONFIG.yearly) return
  CONFIG.yearly = v
  paintPrices(true)
}

function wire(){
  const tr = $('track')
  tr.addEventListener('click', function () { setPeriod(!CONFIG.yearly) })
  tr.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setPeriod(false) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPeriod(true)  }
  })
  $('lblMonth').addEventListener('click', function () { setPeriod(false) })
  $('lblYear').addEventListener('click',  function () { setPeriod(true)  })

  addEventListener('keydown', function (e) {
    if (/^(input|textarea|select)$/i.test(document.activeElement.tagName)) return
    if (e.key === 'ArrowLeft')  setPeriod(false)
    if (e.key === 'ArrowRight') setPeriod(true)
  })

  /* swipe anywhere on the section */
  let sx = null, sy = null
  root.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY })
  root.addEventListener('pointerup', function (e) {
    if (sx === null) return
    const dx = e.clientX - sx, dy = e.clientY - sy
    sx = null; sy = null
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) setPeriod(dx < 0)
  })
}

/* ── boot ──────────────────────────────────────────────────────── */
applyVars()
paintStatic()
wire()
```

## Responsive

- `≤1180px`: headline 78px, max width 900px, smaller decos.
- `≤1024px`: headline 52px, price 46px, max width 720px, cards size to content, decos hidden.
- `≤760px`: plans stack in one column (max 520px); headline 40px.
- `≤640px`: headline 32px, price 36px, radius 20px; each card's two columns stack; taller 50px
  CTA. Smallest supported width ≈ 320px.
- Reduced motion: all transitions and the entrance are disabled.

## Assets

None (no local files; icons and decos are inline SVG). Load the Google Fonts **Inter Tight**
(500–800) and **Inter** (400–800) in `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```