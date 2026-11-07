import type { DemoEntry } from '../types'

type DemoText = Pick<DemoEntry, 'title' | 'description' | 'prompt'>

export const englishDemoCopy: Readonly<Record<string, DemoText | undefined>> = {
  'exhibition-directions': {
    title: 'After Form — One Exhibition, Three Art Directions',
    description: 'Compare a Swiss poster, a Japanese exhibition catalog, and a retrofuturist page using the same artwork and exhibition details.',
    prompt: 'Build a switchable landing page for a fictional exhibition called After Form. Keep its title, dates, venue, and image of an arched sculpture consistent. The Swiss version uses a heavy left-aligned heading, a cropped monochrome image on the right, and vermilion numbering. The Japanese catalog uses warm paper, vertical Japanese lettering on the right, generous margins around the artwork, and a caption. The retrofuturist version enlarges the artwork behind italic display type, lime rules, and monospaced labels. Keep the title, artwork, and dates readable at narrow widths.',
  },
  'art-nouveau-invitation': {
    title: 'Jardin de Nuit — Art Nouveau Invitation',
    description: 'Botanical borders, curved lines, and generous space frame an invitation to a garden after dark.',
    prompt: 'Design an Art Nouveau invitation to a nighttime botanical garden. Use ivory paper with muted green and terracotta. Draw vines, leaves, and flowers as SVG ornaments along both edges. Center a large italic serif heading on two lines and separate the event details with fine rules. Keep the botanical frame clear of the lettering on narrow screens.',
  },
  'mid-century-furniture': {
    title: 'Form & Timber — Mid-century Furniture Landing Page',
    description: 'Geometric forms, walnut grain, and muted upholstery define a landing page for a lounge chair.',
    prompt: 'Design a mid-century modern landing page for a single lounge chair. Divide the warm ivory page into two columns, with a large serif headline on the left and a chair illustration against an arch on the right. Suggest the wood grain with fine strokes. Add mustard, olive, and terracotta swatches that change the upholstery color, and place a small catalog reference on the illustration.',
  },
  'psychedelic-festival': {
    title: 'Solar Echoes — 1960s Psychedelic Festival Poster',
    description: 'Warped lettering and undulating lines announce a music festival in two switchable ink palettes.',
    prompt: 'Create a 1960s psychedelic gig poster. Set two lines of heavy italic type along separate curves with SVG textPath and frame them with an irregular hand-drawn silhouette. Layer waves of varying thickness behind the title. Let viewers switch between sunset orange and blacklight chartreuse. Set the dates and venue in readable monospaced type at the bottom.',
  },
  'spline-tilt-poster': {
    title: 'Tilt Type — Interactive 3D Poster with Spline',
    description: 'Oversized lettering and a cube share a poster. Tilt the cube with the pointer and switch between two palettes.',
    prompt: 'Build a typographic poster that layers oversized HTML lettering over a Spline canvas. Load a .splinecode export with the Spline runtime and rotate the cube in response to pointer position. Offer lime and ice-blue palettes. During loading or if 3D is unavailable, show an isometric SVG cube that responds to the same gesture. When reduced motion is enabled, tilt only while dragging.',
  },
  'japanese-composition': {
    title: 'Japanese Typesetting — Magazine, Event Ad, and Travel Guide',
    description: 'Three layouts illustrate vertical and horizontal Japanese text, ruby readings, columns, and differences in typographic scale.',
    prompt: 'Create three Japanese typesetting specimens. For a literary magazine, place a vertical title with ruby readings on the right of a spread and a short vertical essay on the left. Use shadows to show the gutter. For a department-store event ad, center a large kanji title and dates on a vermilion background. For a travel guide, combine a landscape illustration, a cover headline, and two columns of practical notes. Keep the Japanese sample text in the artwork and show which layout is selected.',
  },
  'material-tickets': {
    title: 'Paper & Light — Foil, Blind Deboss, and Vellum',
    description: 'Compare three finishes on the same ticket. Move the light across each surface to reveal its sheen, impression, or translucency.',
    prompt: 'Lay out three tickets for the same exhibition and finish them in hot foil, blind deboss, and translucent vellum. Clip a metallic gradient to the foil lettering. Use offset highlights and shadows to give the inkless lettering a pressed-in appearance. Show colored paper beneath the vellum. Write pointer coordinates to CSS custom properties so a local highlight and the foil reflection follow the pointer. Stack the samples vertically on narrow screens.',
  },
  'transition-directions': {
    title: 'Transition Studies — Page Turn, Image Zoom, and Stage Curtain',
    description: 'Choose an effect and play it to move between the collection and artwork detail.',
    prompt: 'Create three transitions between a collection and an artwork detail. Turn the page by rotating around the left edge with perspective and rotateY. For the image zoom, give both images the same layoutId so the artwork grows into its position in the detail view. For the curtain, bring two pleated panels together, switch the content at full closure, and pull the panels apart. Honor reduced motion during ordinary navigation and offer a Play transition button to explicitly preview each effect.',
  },
  'theatre-brand-film': {
    title: 'Soft Gravity — Brand Film with Theatre.js',
    description: 'A five-second shot synchronizes camera, lighting, and sculpture. Play, pause, or scrub the timeline.',
    prompt: 'Design a cinematic hero with a violet abstract sculpture and a large serif title. Render it with Three.js and React Three Fiber. Use one Theatre.js sequence for camera orbit, height, and distance, light position and intensity, and sculpture rotation. Add a five-second timeline with play, pause, scrubbing, and reset. Show the first frame on load and play when requested.',
  },
  'rive-expression-index': {
    title: 'Expression Index — Interactive Rive Portrait',
    description: 'Switch the portrait’s expression, the headline, and the paper palette together in a motion poster.',
    prompt: 'Build a motion poster with three portrait moods: calm, happy, and sad. Pass isHappy and isSad from React to a Rive state machine. Coordinate the paper palette and large serif headline with each expression. Let the graphic mark expand an expression index and include SVG portraits for the loading state.',
  },
  'underground-zine': {
    title: 'Basement Press — Cut-and-Paste Music Zine',
    description: 'Switch issues to compare two photocopied covers with halftones, tape, and paper folds.',
    prompt: 'Design a photocopied zine for independent music. Tilt a heavy headline on an off-white cutout and layer an angled, halftone record illustration behind it. Add translucent tape, a paper fold, and subtle copier streaks. Make one issue lime and the other pink, and let viewers switch issues from the masthead.',
  },
  'transit-wayfinding': {
    title: 'East Bay Line — Bilingual Station Wayfinding',
    description: 'Destination, arrow, and platform number read at a glance. Selecting a route updates all three together.',
    prompt: 'Design a destination sign for a fictional rail line. Put a cobalt panel inside a navy frame. Set the destination in Japanese at display size and give the English name a smaller line. Place the direction arrow and platform number together in a route-colored panel. List three bilingual stops beneath the sign and update the arrow, number, color, and destination whenever the route changes.',
  },
  'japanese-type-specimen': {
    title: 'Japanese Type Specimen — Letter and Line Spacing',
    description: 'Compare three spacing presets on the same Japanese text. Vertical setting includes ruby readings and horizontal digits within the line.',
    prompt: 'Create a Japanese Mincho type specimen with a headline, ruby readings, body text, and an issue number. Keep the copy constant while switching between tight, standard, and loose letter and line spacing. Show the values in the margin. Use writing-mode: vertical-rl for vertical text and text-combine-upright to keep the two-digit issue number horizontal. Use warm ivory paper, fine rules, and vermilion ruby readings.',
  },
  'material-light-stage': {
    title: 'Object Lab — Light on Glaze, Velvet, and Metal',
    description: 'Try three materials on the same vessel and move the key light to compare their highlights and reflections.',
    prompt: 'Create a 3D studio for comparing glazed ceramic, velvet, and brushed metal on one vessel. Use LatheGeometry for its profile and MeshPhysicalMaterial with clearcoat, sheen, and anisotropy for the finishes. Use Lightformers for studio reflections and a slider to move the key light. Keep the vessel shape, pedestal, and camera consistent.',
  },
  'embroidered-label': {
    title: 'North Ridge — Woven and Embroidered Patch',
    description: 'SVG patterns evoke twill, a stitched border, and satin embroidery on a patch with three fabric colors.',
    prompt: 'Make an embroidered outdoor-club patch. Give its shield shape a thick stitched edge and a dashed seam. Use SVG patterns to distinguish diagonal twill in the fabric from satin stitch in the mountain and sun. Place the patch on a textile background at a slight angle with a soft shadow. Offer natural, indigo, and forest colorways.',
  },
  'entrance-choreography': {
    title: 'Out of Silence — Entrance Choreography',
    description: 'Replay the same hero with simultaneous, headline-first, and image-first entrances and compare where your eye goes.',
    prompt: 'Build a hero with a sunset illustration, a headline, and a short caption. Offer three timings: simultaneous, headline first, and image first. Play once when the hero enters view and add a replay button. Reveal the image with a horizontal mask and let the headline and caption rise slightly as they fade in. Show three tracks with start times. With reduced motion enabled, show the finished composition and allow an explicit motion preview.',
  },
  'morphing-identity': {
    title: 'Field Identity — Seed, Bloom, and Nova',
    description: 'Sixteen vertices move together to morph one brand mark into three distinct silhouettes.',
    prompt: 'Build a brand mark that morphs between seed, bloom, and nova. Define the same sixteen vertices around a center in a consistent order. Keep their angles fixed and vary radius and horizontal stretch. Interpolate the SVG polygon points with Motion, and change the background and headline with the form. Add a dotted guide circle and center lines. Use instant switching for reduced motion and provide an explicit Play morph button.',
  },
  'bg-shader-waves': {
    title: 'Shader Gradient Waves',
    description: 'A flowing four-color mesh gradient uses simplex noise in GLSL to warp the pattern.',
    prompt: 'Build a flowing mesh-gradient hero background with React Three Fiber and a custom GLSL shader. Output a fullscreen plane in clip space and use 3D simplex noise in the fragment shader to domain-warp a blend of purple (#7038ff), sky blue (#6ec3f4), magenta (#ef008f), and orange (#ffba27). Update uTime, uResolution, and uMouse in useFrame. Let the pointer subtly distort the pattern, add a little film grain, and layer a large white heading over the result.',
  },
  'product-configurator': {
    title: '3D Product Configurator',
    description: 'Change a tumbler’s color, finish, and capacity while a studio-lit model updates in 3D.',
    prompt: 'Build a 3D tumbler configurator in React Three Fiber. Use LatheGeometry for the body and cylinders for the steel base and lid. Offer six color swatches, matte, gloss, and metal finishes, and 350, 500, and 750 mL sizes. Animate color and material properties with useFrame interpolation, scale the body vertically as capacity changes, and update the price. Use Drei PresentationControls for drag rotation, ContactShadows for grounding, and Environment with Lightformer for studio lighting. Set the interface on a pale stone gradient with a frosted white control panel.',
  },
  'win98-desktop': {
    title: 'Windows 98 Desktop',
    description: 'A working Windows 98-style desktop with draggable windows, minimize and maximize controls, a Start menu, and a taskbar clock.',
    prompt: 'Recreate a Windows 98 desktop with 98.css. Place pixel-art SVG icons for My Computer, Notepad, and the Recycle Bin on a teal background. Select icons on click and open windows on double-click. Use Motion drag controls to move windows by their title bars within the desktop. Clicking a window brings it forward. Include minimize, maximize, and close controls, a taskbar with a clock, and a Start menu with nested menus and a shutdown screen. Keep the styles inside a Shadow DOM and confine desktop stacking to the demo.',
  },
  'bonus-disc-launcher': {
    title: 'Bonus Disc 07 — Magazine CD-ROM Launcher',
    description: 'Open wallpapers, an audio sampler, and extras in Windows 98-style windows around an iridescent disc.',
    prompt: 'Build a fictional magazine bonus CD-ROM launcher. Place an iridescent disc with fine concentric grooves on a navy background. Arrange beveled metallic buttons beside it. Offer three illustrated wallpapers, a playable local audio sample, and a wireframe toggle for a small bonus graphic. Open each section in a Windows 98-style window scoped to the launcher and restore focus to its button on close.',
  },
  'oekaki-board': {
    title: 'Little Planet — Heisei Oekaki Drawing Board',
    description: 'Draw a 24×24 pixel image and post it with a name and short message on a personal-homepage drawing board.',
    prompt: 'Build an oekaki board inspired by Heisei-era Japanese personal homepages. Use tiled lavender paper, a pink-to-blue masthead, and double-edged form controls. Let visitors draw on a 24×24 canvas with a palette, eraser, and heart stamp. Support drawing with arrow keys and Space. When a drawing is posted, show its thumbnail, author, message, and date in a newest-first log.',
  },
  'purikura-sticker-album': {
    title: 'Kira Kira — Purikura Sticker Album',
    description: 'Decorate two illustrated photo-booth pages with holographic stars, gel hearts, ribbons, and doodles. Each page keeps its own collage.',
    prompt: 'Build a two-page collage book inspired by Japanese photo-booth sticker albums. Use pink diagonal paper, white photo frames, and original portraits with a printed look. Let the user place holographic stars, gel hearts, doodle rings, and bows at points inside either frame. Keep placement separate by page. Let the user peel off a sticker or undo the last placement.',
  },
  'y2k-skin-workshop': {
    title: 'StereoKit — Y2K Player Skin Workshop',
    description: 'Switch between mirror chrome, translucent smoke plastic, and pink gel while the same track keeps playing.',
    prompt: 'Design one Y2K portable music player with three interchangeable shells: mirror chrome, translucent smoke plastic, and glossy pink gel. Coordinate casing highlights, LCD glow, and pressed button states with each material. Use two local demo tracks, a seek slider, and a volume slider. Keep the current track and its playback position when the skin changes.',
  },
  'memphis-sticker-machine': {
    title: 'POP DROP! — Memphis Sticker Vending Machine',
    description: 'Push a thick-outlined button and watch its sticker fall into the pickup slot of a colorful geometric machine.',
    prompt: 'Create a sticker vending machine with Memphis geometry and thick Neo-Brutalist outlines and offset shadows. Use pink, cyan, and lime for sparkle, orbit, and zigzag buttons. Let the shadow collapse as a button is pressed. Animate the chosen sticker falling and bouncing into a dark pickup slot. Show it immediately when reduced motion is enabled.',
  },
  'sketch-shopping-map': {
    title: 'Walking Notes — Hand-drawn Shopping Street',
    description: 'Choose a shop on a notebook map to draw a route in red ink and reveal a taped note.',
    prompt: 'Draw a fictional shopping street on graph paper. Use seeded Rough.js paths for winding roads, hatched storefronts, and irregular trees. Give the café, bookshop, and flower shop clickable signs. Show a red-ink route from the station and a taped note for the chosen stop. Stack the map and note on narrow screens.',
  },
  'optical-disc-loader': {
    title: 'OPTIC 07 — Y2K Disc Loader',
    description: 'A holographic disc spins as the drive powers up, reads the disc, and verifies the data.',
    prompt: 'Design a Y2K optical drive loading screen. Draw an iridescent disc with a conic gradient and concentric grooves, then spin it with Motion. Add a read light and a 20-segment progress meter to a dark metallic housing. Label spin-up, reading, and verification, and show a checkmark at completion. Include a reload button and keep the disc and read light still in reduced-motion mode.',
  },
  'win98-copy-loader': {
    title: 'Windows 98 — File Copy',
    description: 'Pages fly between yellow folders as a blue segmented bar fills. Cancel mid-copy or start over.',
    prompt: 'Build a Windows 98 file copy dialog on a teal desktop. Scope 98.css to a Shadow DOM. Draw yellow folders in SVG and animate a page flying between them. Update the active filename and blue segmented progress bar. Freeze the current progress on Cancel and reset it on Copy again. Keep the page still in reduced-motion mode.',
  },
  'memphis-loading-relay': {
    title: 'Play Objects — Memphis Assembly Loader',
    description: 'A pink circle, blue triangle, and lime square hop into their dashed slots one at a time.',
    prompt: 'Make an indeterminate loader with Memphis geometry and chunky Neo-Brutalist outlines. Place a pink circle, blue triangle, and lime square on a dotted stage with zigzags. Use Motion easing on a shared timeline so each piece hops into its dashed slot in order and stays there. Announce completion once all three are seated. Include a replay button and fill the slots in discrete steps with reduced motion.',
  },
  'sketchbook-loader': {
    title: 'Little Planet — Hand-Drawn Sketch Loader',
    description: 'A pencil reveals a Rough.js rocket and its hatching on lined paper before a red stamp marks the finished sketch.',
    prompt: 'Turn a lined sketchbook into a loader. Draw a rocket and stars with seeded Rough.js paths. Reveal the outline, hatching, and finishing marks stroke by stroke with SVG stroke-dashoffset. Use getPointAtLength to put the pencil tip at the end of the active stroke, then lift it between strokes. Use a taped note for sketching, coloring, and finishing states. Stamp DONE in red when the drawing finishes. Stack the drawing and note on small screens.',
  },
  'missing-archive-404': {
    title: 'Missing Archive — 404 Page Not Found',
    description: 'A missing sheet in a paper index becomes a 404 page, with a dashed zero, a red search line, and a return link.',
    prompt: 'Design a 404 page as a sheet from a paper archive. Use cream stock, two heavy SVG fours, and a dashed red zero marked with registration guides. Animate a search line inside the zero once and stamp MISSING over the right-hand four. Finish with a clear Page not found heading, a short explanation, and a return link. On narrow screens, place the link under the copy.',
  },
  'signal-lost-500': {
    title: 'Signal Room — 500 Internal Server Error',
    description: 'A lost television signal becomes a 500 page. Retry to sweep a scan band across the screen and reveal a landscape when the connection returns.',
    prompt: 'Build a 500 error page around a vintage field monitor. Put muted color bars and scanlines inside the curved CRT and place the error explanation, retry button, and return link beside it. Simulate a retry with a moving scan band, then replace the bars with an original SVG landscape and a restored message. Keep the band still with reduced motion and let visitors replay the error.',
  },
  'bbs-reconnect': {
    title: 'Night Window — Heisei BBS Reconnect',
    description: 'A 56K modem loses its connection. Keep editing the draft while it reconnects, then post the same message.',
    prompt: 'Design a Heisei-era personal bulletin board with a lost connection. Use blue striped wallpaper, a pastel title band, and beveled controls. Show the current draft next to a 56K modem with status lights. Let the visitor keep editing while reconnecting, then post the same draft when the connection returns. Simulate the disconnect within the demo.',
  },
  'disc-read-recovery': {
    title: 'Nova Disc — Y2K Disc Read Recovery',
    description: 'A mint LCD shows a read error. Eject and reinsert the iridescent CD to watch the drive retry.',
    prompt: 'Build a Y2K portable CD player with a simulated disc read error. Use lilac metal, an iridescent disc, and a mint LCD that shows the error code and the next step. Change the disc position, spin, and indicator light through ejection, reinsertion, retry, and recovery. Include a way to trigger the error again and show each state in reduced-motion mode.',
  },
  'station-ticket-machine': {
    title: 'East Bay Line — Station Ticket Machine',
    description: 'Choose a destination and fare, then collect the paper ticket that emerges from the slot.',
    prompt: 'Design a station ticket machine for a fictional railway. Put three destination buttons with station codes and fares on a cream console. Add a dark green status display and an orange print button. Let the ticket slide out of a dark slot and support collecting it by click or keyboard. Keep the destination fixed until the ticket is collected and snap the ticket into place with reduced motion.',
  },
  'split-flap-departures': {
    title: 'Skyline Airport — Split-Flap Departures',
    description: 'An old airport board that flips each row and column in sequence to display the next flights.',
    prompt: 'Build a mechanical airport departure board with time, flight, destination, and gate columns. Split each black tile into two halves. On update, fold the old upper flap toward the hinge and open the new lower flap. Stagger the flips across rows and columns, expose the values as table text for assistive technology, and update immediately when reduced motion is enabled.',
  },
  'instant-photo-loader': {
    title: 'Sunroom Film — Instant Photo Development',
    description: 'A pale desert sunset develops into a crisp, colorful print while a film-strip meter tracks the stages.',
    prompt: 'Use an instant photo developing as a loading screen. Put an original SVG desert sunset inside a cream photo frame on a dark green backdrop. Gradually reduce blur and increase saturation, contrast, and opacity. Label exposure, development, and color setting next to a 12-frame progress strip. Add a replay button.',
  },
  'slash-page-transition': {
    title: 'Crimson Cut — Red-and-Black Slash Page Transitions',
    description: 'Inspired by Persona. Red, black, and white diagonal bands, jagged shards, and a GLSL ink wipe slice across the screen, then the next page arrives with a tilted cut-out heading.',
    prompt: 'Build a page transition for a stylish JRPG menu using only red, black, and white. When the page changes, tilted red and black bands sweep across the screen in sequence, jagged polygon shards and a halftone overlay flash briefly, and a \'NEXT\' title card shows before the new page appears. Set each page heading at a strong tilt in ransom-note letters, varying the background color, angle, and typeface of every character. Offer several patterns (diagonal bands, shattering shards, stripes, halftone dots, a GLSL ink wipe whose noisy edge bleeds with halftone dots, random), allow arrow-key paging, and use a short crossfade when reduced motion is enabled.',
  },
  'tilted-pause-menu': {
    title: 'Off-Axis Menu — Slam-In Pause Menu and Cut-Ins',
    description: 'Inspired by Persona. Pausing freezes the scene and red, black, and white bands slash across it, then tilted menu items slam in one by one over a WebGL focus-line and halftone backdrop. Confirming fires a focus-line, eye-strip cut-in and opens a sub-screen with its own choreography.',
    prompt: 'Build a stylish JRPG pause menu. Start on a side-scrolling night-street game screen; pressing Esc freezes it into a gray-and-red still, then a white flash and red, black, and white diagonal bands sweep across while a WebGL shader backdrop (wobbling sunburst rays, ink clouds, halftone dots, shockwave rings) wipes in diagonally. Menu items, each with its own tilt and size, slam in one by one from off-screen with overshoot, and a ransom-note "PAUSE" stamps in the center before flying to the corner. The selected item gets a jittering, breathing jagged highlight with red ghost trails and a motion smear, and its letters jolt one by one. Confirming plays an inverted impact frame, manga focus lines, and alternating bands (eye close-up, cut-out label, outlined English word), then opens a jagged-tabbed sub-screen with per-item choreography (staggered rows, dealt cards, filling bars, a springing radar chart); Esc returns with a reverse slash. The character is an original 2D SVG silhouette.',
  },
  'stylish-battle-command': {
    title: 'Knockdown Rush — Stylish Battle Commands into a Finisher',
    description: 'Inspired by Persona. Hit an enemy\'s weakness from a fanned, tilted command menu and a giant cut-out "WEAK" plus an eye-strip cut-in grant an extra turn; knock everyone down and the party surrounds them for an ink-splash finisher.',
    prompt: 'Build a stylish JRPG turn-based battle screen using only red, black, and white, over a red-black swirl drawn in GLSL. Put four slanted cut-out party tiles with HP/SP bars at the bottom right (the active member enlarges and pops), and above them a fanned, tilted command cluster (Attack, Skill, Shoot, Guard, Item, Tactics) where a jagged inverted highlight snaps to the selection and the label\'s letters hop one by one. Skill slides out a tilted list with element icons and SP costs. Three original shadow-creature silhouettes are targeted with a spinning jagged reticle. Hitting a weakness shakes the screen, slams a huge ransom-letter "WEAK", knocks the enemy down with circling stars, and sweeps an eye-strip cut-in announcing an extra turn. When all are down, party silhouettes surround them and you choose an all-out attack (fight cloud, ink splash, FINISH, results) or letting them go. Support keyboard control and reduced motion.',
  },
  'all-out-finish': {
    title: 'All-Out Finale — Red, Black, and White Party Finisher',
    description: 'Inspired by Persona. The party surrounds cowering foes and dives into a GLSL comic brawl cloud with cut-out onomatopoeia, then hard-cuts to the chosen finisher\'s splash with ink splatter, a racing damage total, and a slammed 撃破 stamp.',
    prompt: 'Build a stylish JRPG "all-out attack" finishing cinematic using only red, black, and white. In the idle hold-up, four original crew silhouettes (white outline, red offset shadow) surround cowering enemies while an All-Out button pulses. On trigger, a diagonal cut-in banner and focus lines sweep in, the crew crouch and leap with smear ghosts, and the camera zooms and shakes. A GLSL comic dust cloud (noise-warped puffs, white rim, red outline, halftone fringe) boils while fists and blades poke out, and slash streaks, impact stars, and tilted ransom-note onomatopoeia (ドカッ, バキッ, ズドン) pop. Then a one-frame inverted impact panel hard-cuts to a full-screen splash: diagonal bands, rays, halftone, and the member\'s emblem behind the chosen finisher\'s dramatic pose, a brush stroke with the ransom-letter technique name, and the enemy bursting into canvas ink splatter. Results race up the total damage and slam a 撃破 stamp. Include finisher selection, normal and slow speed, skip (Esc), Enter to start, and a still-image fallback for reduced motion.',
  },
  'victory-results': {
    title: 'Victory Slam — Stylish JRPG Battle Results',
    description: 'Inspired by Persona. Red-and-black bands slam across as a swordswoman silhouette strikes a victory pose. EXP and money count up, overflowing EXP bars burst into LEVEL UP!, then stat gains, a new skill, and item drops slam in one after another.',
    prompt: 'Build a stylish JRPG post-battle results screen using only red, black, and white. It opens with red and black diagonal bands and a cut-out "VICTORY" sweeping across while the whole screen tilts and springs back. An original swordswoman silhouette (white outline, offset red shadow) dashes in with afterimages, lands on a speed-line impact frame, and raises her sword; afterwards her coat and hair flutter and she breathes. Earned EXP and money (with a coin glyph) count up quickly in tabular numerals, and four party EXP bars fill with a white glow at the leading edge. When a bar overflows, a burst ring and a cut-out "LEVEL UP!" slam onto that row and the level number flips. A stat sheet then ticks +N per stat with pops and growing bars, and a "new skill learned" card flips in. Item drops slide in one by one as tilted rows with rarity colours and a shine sweep. The background is a GLSL rotating sunburst with halftone and speed lines. The first press of Next or Enter skips to the final values and the second replays; with reduced motion, final values show immediately.',
  },
  'calendar-day-transition': {
    title: 'Day Break Calendar — Tear-off School Calendar Transition',
    description: 'Inspired by Persona. Over a cel-shaded sky and skyline that change with the time of day, a tilted tear-off calendar page rips away and the new date slams in with comic impact lines. Includes a one-week fast-forward, a month-change cut-in, and event-day stickers.',
    prompt: 'Build a school-life-sim "day advance" calendar screen in a stylish red, black, and white look. Place a heavily tilted tear-off page with the month and day in mixed bold type, the weekday on a jagged tag, and an animated weather icon (sunny, cloudy, rain, snow, storm) and moon phase beside it. The background is a city skyline under a cel-shaded GLSL sky whose colours shift through dawn, morning, lunch, after school, evening, and midnight, with a halftone sun or moon, clouds, rain, snow, and stars. Next slides the time-of-day highlight; after midnight the page tears off and flies away diagonally, the new numerals slam in with overshoot and radial impact lines, and a strip of upcoming dates scrolls by one. Skip a Week fast-forwards the days with smear and flickering weather, then stops hard with a screen shake. A month change gets a giant month-number cut-in, and event days show a tilted sticker plus a typed caption line.',
  },
  'stylish-phone-chat': {
    title: 'Burst Talk — Tilted In-Game Phone Group Chat',
    description: 'Inspired by Persona. Jagged speech bubbles pop, overshoot, and shake into a tilted in-game smartphone, and picking a reply fires a cut-in band and a slash as the conversation branches.',
    prompt: 'Build a stylish JRPG in-game smartphone group chat. Put a perspective-tilted phone that reacts to the pointer on a black background with a GLSL red halftone field and drifting jagged shards. Bubbles are angular polygons with thick outlines, a red offset shadow, and lightning-shaped tails. Three friends (original cut-out face icons with name tags) show a "…" typing bubble, then their messages spring in with overshoot and a quick shake; long ones type out letter by letter, and stickers occasionally burst in. Replies slide in as tilted cards; choosing one fires a screen-wide cut-in band and a diagonal slash, and the conversation branches to three different endings. Include notification banners from other threads, a thread list with unread badges, auto/manual and reset controls, Enter and arrow-key control, and a reduced-motion mode.',
  },
  'bond-rank-up': {
    title: 'Star Bond — Constellation-Card Bond Rank-Up',
    description: 'Inspired by Persona. Pick a companion from a tilted bond list and a foil constellation card spins in, links its stars one by one, then slams the new rank number home with a shockwave, ransom-letter "RANK UP", a new-ability banner, and a typed line of dialogue.',
    prompt: 'Build a stylish JRPG "bond rank-up" sequence in only red, black, and white. List six companions as tilted, staggered rows with a constellation sigil, their relation, and 1–10 rank pips. Selecting one and pressing Rank Up darkens the screen with halftone dots and diagonal bands, then a holographic-foil constellation card spins in, in 3D, and stops face-on. Its constellation lines draw star by star and the stars flare. The rank number flips and slams in with a jagged shockwave, speed lines, shards, an inverted comic impact frame, and screen shake. Then come ransom-note "RANK UP!" letters (each with its own colour and typeface), a "new power" banner, and the companion\'s dialogue typed one character at a time. Rank 10 turns everything gold. Click or Enter skips, Esc closes, and the new rank stays in the list. With reduced motion, use short fades instead.',
  },
  'gacha-summon': {
    title: 'Star Draw — Rarity-Coded Gacha Summon',
    description: 'A mobile-game summon sequence. A 3D magic circle and a vortex of light shift from blue to gold to rainbow to hint at rarity, then holographic cards flip to reveal the results. Supports single and 10x pulls.',
    prompt: 'Build a gacha summon sequence in React Three Fiber. Lay a multi-layer magic circle flat on the floor with its rings counter-rotating, add a GPU particle vortex spiralling into a light pillar, and push the camera in while the summon charges. When the result includes higher rarities, escalate the light from blue to gold to rainbow, sending a shockwave across the floor and raising bloom at each step, with hue cycling and pulsing chromatic aberration at the top tier. Then deal face-down cards that flip on tap or with Flip All, saving the top rarity for last with a brief shake. The cards tilt toward the pointer and show rarity-colored holographic foil, and the top rarity fires confetti. Include skip, a demo toggle that guarantees the top rarity, a results summary, and instant results when reduced motion is enabled.',
  },
  'monster-battle': {
    title: 'Pocket Monster Battle — 3D Monster Battle',
    description: 'Inspired by Pokémon. Toon-shaded 3D monsters face off on grass platforms, and the camera cuts on every attack. HP bars drain from green to yellow to red while the message box types out each line.',
    prompt: 'Build a 3D monster-battle screen. Use React Three Fiber for a gradient sky, distant hills and trees, and two round grass platforms. Assemble original monsters from primitives with a toon material and outlines. On entry, frame the enemy close up, then sweep back to the default shot. For attacks, cut between an over-the-shoulder shot and a close-up of the target, and add a lunge, a type-coloured projectile with particles, rings, a light flash, and a blink with knockback. Fainted monsters dissolve away in blocks. Overlay a DOM HUD: rounded info panels with name, level, and an HP bar that drains from green to yellow to red; HP numbers and an EXP bar on the player\'s side; a typewriter message box that waits on ▼; a 2×2 Fight/Bag/Monsters/Run menu; and a move list with type colours and PP. The capture capsule flies in an arc, wobbles, then succeeds or fails. Skip camera moves and shake for reduced motion.',
  },
  'encounter-transitions': {
    title: 'Wild Encounter — Shader Encounter Transitions',
    description: 'Inspired by Pokémon. Walking through tall grass flashes the screen twice, then a shader turns the pixel-art field into a 3D battle with spiral, blinds, bars, pixelate, iris, swirl, or shattering-glass effects.',
    prompt: 'Create RPG encounter transitions. A hero walks a top-down pixel-art map, and stepping into tall grass sometimes flashes the screen white twice. Pass the field canvas and an off-screen 3D battle scene to a fullscreen GLSL quad and blend between them with spiral blocks, horizontal blinds, black bars that close and reopen, pixelation, an iris centred on the hero, a swirl, or triangle shards that shatter and fall. The enemy slides in from the distance as the camera moves closer. Let viewers pick and preview each effect, and support arrow keys and on-screen buttons. Use a crossfade for reduced motion.',
  },
  'monster-dex': {
    title: 'Field Index — 3D Monster Index',
    description: 'Inspired by Pokémon. In a red index device, choosing an entry sends a scan line up a 3D model on a turntable, changing a black silhouette into colour and revealing its types, category, stats, and description.',
    prompt: 'Design a monster-index device with two LCD-style screens in a red case: a numbered list on the left and details on the right. In the details, show a 3D turntable the viewer can drag, with auto-rotation and toon-shaded monsters lit by a rim light, and fit the camera to each model. When a discovered monster is selected, sweep a shader scan line from bottom to top, changing its black silhouette into colour. Undiscovered entries stay as "???" silhouettes. Include type badges, a category, height and weight, six stat bars, and a typewriter description. Navigate with the up and down arrow keys or the mouse wheel, and add blinking lamps. Use original monster designs.',
  },
  'party-screen': {
    title: 'Party Lineup — Handheld Monster Party Screen',
    description: 'Inspired by Pokémon. A party screen with a large lead slot and five smaller slots. HP bars change from green to red, status badges are shown, the selected card tilts with a holographic sheen, and stats appear on a radar chart.',
    prompt: 'Build a handheld monster-RPG party screen. Show the lead monster in a large card on the left and the other five in a column on the right. Each card shows an original SVG monster icon, name, level, an HP bar that turns from green to yellow to red, HP numbers, and badges for poison, paralysis, sleep, or fainted. Dim fainted cards. Selecting a monster opens Summary, Switch, and Item options. When you switch, the two cards fly and resize into each other\'s slots using shared-layout animation. Healing items make the HP bar and number count up. Tilt the selected card toward the pointer with a holographic foil sheen, show stats as a six-axis radar chart that morphs between monsters, and add ring and particle bursts for healing and swapping. Support arrow keys, Enter, and Escape, and show messages in a typewriter window.',
  },
  'visual-novel-adv': {
    title: 'Afterglow Station — Visual Novel ADV Screen',
    description: 'Dusk at a seaside station rendered with a WebGL sky and glittering sea, expressive characters, a translucent text window, auto, skip, backlog, and hide controls, and a choice that branches the story.',
    prompt: 'Build a visual-novel ADV screen at a seaside train station at dusk. Render the sky and sea with a full-screen GLSL shader: drifting lit clouds, a setting sun, and a glittering column of sunlight on the waves. Let the sun sink as the story advances, add pointer parallax and film grain, and play a light-leak transition when a choice is made. Keep an SVG station foreground aligned to the same horizon. Place original anime-style characters with switchable expressions, blinking, and mouth movement while they talk. Brighten the speaker, dim the others, and slide characters between left, center, and right. Overlay a translucent text window with a name plate. Type text one character at a time, pausing at punctuation. The first click completes the line and the next advances, with a bobbing click-wait icon at the end. Add Auto, Skip, Log, and Hide buttons with keyboard shortcuts, plus a backlog overlay that records past lines and choices. Midway through, offer a choice that branches into two endings.',
  },
  'grid-inventory': {
    title: 'Attaché Grid — Tetris-style Case Inventory',
    description: 'A survival-horror attaché case. Drag items of different sizes onto a 10×6 grid with a live fit preview, rotate them, and examine any item as a 3D model you can spin.',
    prompt: 'Build a grid inventory inside a stitched leather attaché case with a 10×6 grid that fills the available space. Draw items from 1×1 to 2×4 as SVG icons, such as firearms, ammo, medical items, and tools. Implement dragging with pointer events and pointer capture. Show a snapped preview that is green where the item fits and red where it overlaps or leaves the grid. Rotate 90° with R or right-click, including during a drag. Add a floor area outside the case for picked-up items, and show the selected item\'s name, category, size, and description at the bottom. An Organize button repacks the case largest-first and animates items into place. Selecting an item and choosing Examine (or double-clicking) opens a React Three Fiber viewer. The item, modelled from primitives with metallic and rough materials, can be spun by dragging under soft studio lighting with contact shadows. Light it with Lightformers rather than downloaded HDRs.',
  },
  'fighting-hud': {
    title: 'Round One — Versus Fighting Game HUD',
    description: 'A fighting-game HUD over a 3D neon rooftop at dusk, with delayed red damage trails, a 99-second timer, round pips, three-level super meters, glowing hit sparks, camera punch-ins, and a screen-shaking K.O.',
    prompt: 'Build a versus fighting game HUD over a React Three Fiber stage: a neon rooftop at dusk with a reflective floor and neon grid, a striped synthwave sun, shader-lit city windows, and neon signs, all lifted by bloom. Render two original fighter silhouettes as textured billboards with lunges, recoil, and white hit flashes. Mirror slanted health bars at the top, where the yellow bar drops instantly and a red damage trail catches up after the combo. Put a 99-second timer and round pips in the center and three-level super meters at the bottom. Light, Heavy, and Super (J/K/L) spawn GPU hit sparks and combo counters; heavy hits and supers push the camera in. Open each round with "ROUND 1" and "FIGHT!" banners, and slam a huge "K.O." with camera shake. Tone the camera motion down for reduced motion.',
  },
  'boss-battle-hud': {
    title: 'Ashen Keep — Dark Fantasy Boss Battle HUD',
    description: 'A dark-fantasy boss HUD over a 3D ruined keep with fog and embers, where a crowned giant assembles from noise, telegraphs and slams its greatsword, and burns away into embers on defeat.',
    prompt: 'Build a dark-fantasy action RPG boss HUD over a React Three Fiber scene: a moonlit ruined keep with an ember-lit gate, towers, wet flagstones, braziers, exponential fog, drifting fog sheets, and GPU ember particles, finished with bloom and ACES tone mapping. Build the boss from primitives with a glowing crown and eyes. It raises its greatsword as a telegraph, then slams it down with a shockwave ring and camera shake. A dissolve shader makes the boss assemble from noise when it appears and burn away from glowing edges into embers when defeated. Keep thin health, focus, and regenerating stamina bars at the top left, equipment slots with a flask count at the bottom left, and a long boss bar at the bottom with a lagging white trail and a running damage total. Reveal the area name in serif type on entry and show victory or defeat in a dark band. Attack, Dodge, Heal, and Summon buttons (J/K/H/B) drive the fight.',
  },
  'open-world-hud': {
    title: 'Wayfarer — Open-World HUD',
    description: 'An open-world HUD over a walkable 3D landscape, with a scrolling compass of distance markers, a rotating minimap, a quest tracker, new-objective notifications, and a light pillar marking the goal.',
    prompt: 'Build an open-world game HUD over a React Three Fiber world: procedural low-poly terrain, a golden-hour sky with the sun, fog, a water shader, instanced forests, and 3D landmarks such as a lighthouse with a rotating beam, a watchtower, and a village. Match the river, coast, and forests to the minimap\'s geography. Scroll heading ticks and distance-labeled objective and landmark markers across a compass strip at the top, and raise a light pillar over the current goal. Rotate a circular minimap with the heading at the bottom right and list quest objectives at the top right; completing one checks it off and fades a "New Objective" notice in near the top center. Drag or hold the left/right arrows to turn, and hold the up arrow to walk, keeping distances and the minimap in sync. Drive the camera from a motion value instead of re-rendering React every frame.',
  },
}
