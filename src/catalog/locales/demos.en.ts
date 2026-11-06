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
}
