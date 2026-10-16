# Papa’s Rolleria

A playable cinnamon-roll cooking game with four stations and 210 original, editable SVG assets. Run a four-customer shop day, earn tips, and reopen for another day with new recipes.

## Play locally

Requires Python 3.9+ to serve/build and Node.js 22+ to run tests. No dependency installation, API keys, accounts, or network services are needed.

```sh
npm run dev
```

Open **http://127.0.0.1:4173/**. Alternatively run `python3 -m http.server 4173 --bind 127.0.0.1`. Use a server rather than opening HTML files directly: ES modules and the asset manifest require HTTP.

## How to play

1. **Order:** Take the customer's three-roll order. Each numbered recipe appears on the ticket.
2. **Dough:** Select each roll, choose dough, flatten it, spread butter and filling, roll it up, and slice. Drag ingredients/tools onto the board or use the action buttons. Cut when the moving marker reaches the green zone.
3. **Bake:** Load all three rolls and pull the tray out between **17 and 23 seconds**. The oven continues while you switch stations. A burnt or underbaked batch can be rebaked before serving.
4. **Build:** Select a roll, choose its icing, drizzle, and topping, and apply each in three passes. Drag the ingredient onto the pastry or click Apply. Match every ingredient to the ticket.
5. **Serve:** Receive dough, baking, and decoration scores and tips. Serve all four regulars to finish the day. Next day retains your bank and generates fresh orders.

The game supports mouse, touch, and keyboard. Every required drag has a button equivalent. Use Tab and Enter for controls. Escape or Pause stops the clock. Help and switching browser tabs pause active cooking. Sound is optional and generated locally after enabling it.

Progress saves in this browser's local storage after actions and during cooking. Reloading offers Continue; time away never burns your rolls. Saves are local to this device/browser, not synchronized to GitHub or a server. Start fresh requires confirmation and replaces the saved game. If storage is blocked, the game remains playable in the open tab.

## Art kitchen

Open **/studio.html** or the “Art kitchen” link for the original four station previews and searchable SVG gallery. Compare expressions, preparation states, baking states, and decoration layers, or download individual SVG files and the manifest.

The gallery's explanatory text describes the artwork milestone; the playable game lives at `/`.

## Project structure

- `game-engine.js`: pure gameplay rules, state transitions, scoring, recipes, and validated save restoration.
- `game.js`, `game.css`, `index.html`: interactive game, pointer/keyboard controls, timers, sound, and responsive presentation.
- `studio.html`, `app.js`, `styles.css`: artwork gallery and inspection previews.
- `assets/`: 210 SVG files plus `manifest.json` with dimensions, anchors, families, and states.
- `scripts/draw_assets.py`: reproducible original SVG drawing source.
- `ART-DIRECTION.md`: drawing conventions and extension guide.
- `tests/game.test.js`: gameplay regression tests.

## Validate and build

```sh
npm test                  # gameplay rules and the complete SVG contract
node --check game.js      # browser-controller syntax
node --check app.js       # gallery syntax
npm run build             # validated static site in dist/
npm run assets            # regenerate artwork after editing its drawing source
```

`npm run build` also packages the source, artwork, tests, and documentation in `output/papas-rolleria-starter-kit.zip`. The build validates both the source and production output, including the favicon referenced by both pages. Run these checks before pushing changes. Automated GitHub Actions configuration is not included because the current GitHub login does not grant workflow-write permission.

## Hosting

`dist/` is a portable static site; publish its contents using any static host. No backend is required. There is no deployment configured in this repository. The editable site icon is `public/favicon.svg`; verify it returns HTTP 200 in any deployed build before shipping to Vercel.

## Current scope

This version is a complete single-player shop-day loop with customers served sequentially. Simultaneous order queues, upgrades, cloud saves, and a soundtrack are future additions. Original characters and shapes were drawn for this project; supplied game screenshots are references and are not embedded assets.
