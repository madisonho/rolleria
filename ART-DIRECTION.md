# Art direction & asset contract

## The look

Papa’s Cinnaboneria is a cheerful small shop with cinnamon woodwork, turquoise fixtures, cream paper, hand-shaped silhouettes, and heavy rounded outlines. Keep the scene dense with purposeful tools while leaving the food work area clear. The spiral is the recurring signature, appearing on pastry tops, the worker’s hat, branding, and the wallpaper.

| Token | Hex | Use |
|---|---|---|
| Cocoa ink | `#3c2726` | Outlines, lettering, deep creases |
| Buttercream | `#fff1d2` | Paper, highlights, labels |
| Shop turquoise | `#40c5bb` | Fixtures and worker uniform |
| Cinnamon | `#b97032` | Pastry sides and warm wood |
| Golden dough | `#eaaa55` | Golden classic rolls |
| Order green | `#65bd50` | Order station navigation |
| Dough violet | `#ac72d4` | Dough station navigation |
| Bake orange | `#ef9a41` | Bake station navigation |
| Build blue | `#49a9d6` | Build station navigation |

Use 5-unit exterior strokes on a 300-unit sprite, 2–4 units for internal details, round caps, and round joins. Food fills have a darker side, lighter top, and restrained curved highlights. Avoid photorealistic textures and black drop shadows. Raster images are not used.

Trebuchet MS / a rounded system sans-serif supplies the gallery, readable live labels, and SVG lettering. Logo lettering is editable SVG text, not a custom font. Small UI elements remain geometric enough to read at gameplay scale. The gallery uses spaced uppercase utility captions and bold rounded headings. No remotely loaded fonts are required.

## Coordinate and layering rules

- Each station uses a **1440 × 1000** logical canvas. The bottom 103 units belong to the station navigation; the rightmost 280 units hold the active ticket.
- Scenes are assembled from separate `<img>` layers. Backgrounds do not bake in movable tools, characters, tickets, or food.
- Every roll and full-size food overlay uses a **300 × 280 viewBox** and **[150, 160] anchor**. Apply identical translation and scale to every layer.
- Stack food as shadow/side/top → filling spiral → icing → drizzle → topping scatter. Individual toppings are separately provided in 40 × 40 viewBoxes.
- Character sources use 300 × 580 for full body and 300 × 390 for counter crops; anchor at [150, 550] or [150, 380]. Counter compositions intentionally crop the lower body. All expressions in a family share the same placement.
- The scene’s dynamic customer name, order number, instructions, and clock reading remain HTML text. Decorative fixed labels live in SVG where appropriate.
- The gallery adds a checkerboard behind sprites. It is not part of the SVG artwork.

## IDs and states

Files follow `assets/{category}/{id}.svg`. Asset IDs are stable lowercase kebab case.

Examples:

- `roll-classic-cinnamon-golden`: dough, filling, doneness.
- `dough-cocoa-chocolate-cinnamon-sliced`: dough, filling, preparation stage.
- `juniper-full-impatient`: character, composition, expression.
- `button-bake-selected`: station, control state.
- `symbol-icing-vanilla` and `symbol-drizzle-vanilla`: distinct ticket symbols even when flavor names match.

Every manifest entry has `id`, `category`, `file`, `width`, `height`, `anchor`, `family`, `state`, `availableStates`, and `tags`. Family groups drive the state picker. The top-level `sampleOrder` records the same three rolls used throughout the station previews.

Named SVG groups include `roll-side`, `roll-top`, `filling-spiral`, `icing`, `drizzle`, `toppings`, `legs`, `shoes`, `arms`, `torso`, `neck`, `head`, `hair-front`, `hair-back` where present, `expression-*`, `hat`, `apron`, `oven-door`, `oven-interior`, `timer-needle`, and `steam`. Inline an SVG to target those groups for future animation; externally loaded `<img>` elements do not expose internal groups to CSS.

## Extending the kit

Edit `scripts/draw_assets.py` for reproducible additions, or edit an individual SVG for one-off experiments. Regeneration replaces the generated SVG files, so bring any SVG edits back into the generator before running it again. The `save()` helper registers dimensions and metadata. Add ingredient art as a complete set: container, ticket symbol, and aligned food layer. Add new recipes to the manifest source, then update preview copy if the starter menu changes.

Keep each new state in the same viewBox with the same anchor. Validate XML, state inventory, symbols, and layer dimensions with `python3 scripts/validate.py`; inspect the state at gameplay size and in the asset detail panel. Build before handoff to verify production paths and the favicon.
