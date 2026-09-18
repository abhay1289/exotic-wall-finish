# MØBEL — hero furniture review

The room, composition, camera route and furniture collection have been retained. The polish focuses on the things that make the objects feel manufactured and lived with: rounded edges, believable upholstery, correct material scale, restrained reflections and readable lighting.

The review covers the living room, dining area, lighting and the upstairs bedroom within the scrolling hero. These are real-time models built in code. High-resolution surface maps improve their detail; they do not turn the underlying geometry into scanned furniture.

## Object by object

| Object | What reduced realism | Refinement in this pass |
|---|---|---|
| **Havn sectional — structure and seats** | Repeated, uniformly shaped cushions; texture stretched to the size of each piece. | Upholstery mapped in metres, scanned linen surface detail, subtle seat compression, rounded cushion edges and fine perimeter piping. |
| **Havn — back and accent cushions** | Identical upright blocks and overly regular silhouettes. | Slight variations in lean and rotation, softer shapes and a more restrained textile sheen. |
| **Throw on the chaise** | A flat rectangular block sitting on the seat. | A continuous cloth surface that crosses the seat, bends over the front edge and hangs down with folds. |
| **Bue cognac lounge chair** | Black, stretched details on the arm end-caps; a flat cylindrical seat and conspicuous hard edges. | Rebuilt end-cap UVs and winding, rounded padded arm ends, a domed seat with piping, and scanned leather grain with varied roughness. The cognac tone is more muted. |
| **Bue ottoman** | A uniformly rounded box with a glossy, plastic-like surface. | Shared leather grain at a consistent physical scale, a shallow cushion depression, fine piping and a quieter metal finish. |
| **Charcoal Bue chairs** | The same arm-end and cylindrical-seat limitations as the leather chair. | The same geometry corrections, with matte woven upholstery and reduced synthetic-looking highlights. |
| **Ull rug — both floors** | Dark, mottled patches made it read more like a hard surface; exaggerated thickness at its edge. | A lighter, more even wool tone, scanned yarn relief, a thinner rounded edge and the existing woven border retained. Individual fibres are represented by shading, not thousands of separate strands. |
| **Sten coffee table** | Broad, uniform dark faces and limited grain response. | Fine wood grain, controlled surface relief, satin reflections and bevels that catch the light. This is a dark stained wood shader, not a scan of the actual Sten product. |
| **Books, vase and bowl** | Books reused upholstery materials; vessels had cut-open profiles without a convincing inner wall. | Separate paper and cover materials, fuller vessel profiles, visible lip thickness and inner surfaces, and a matte stoneware finish. |
| **Tavle dining table** | Sharp slab edges and stretched procedural grain. | Scanned walnut, grain mapping based on panel dimensions, a softened tabletop edge and an apron beneath the top. |
| **Stol dining chairs** | Thin rectangular seat and back panels looked rigid. | Padded, gently shaped seats and backs, fine upholstery detail and small placement variations. |
| **Hylle consoles** | A single undivided wooden box. | Recessed plinth, narrow door divisions, softened wood edges and the shared walnut material. |
| **Ring side table** | Uniform dark metal, coarse surface noise and a vase that used fabric shading. | A quieter bronze response with subtle surface variation, plus a dedicated ceramic vase material and a formed rim. The basic pedestal shape is retained. |
| **Glød pendants** | Strong emission flattened the globes into uniformly glowing balls. | More visible reflection, lower shell emission and a more distinct inner bulb. The glass remains an efficient real-time approximation; this pass does not add full physical refraction. |
| **Console and bedside lamps** | Simple metal stems did not match the stoneware description; shades lacked construction detail. | Turned stoneware bases, linen shades with upper and lower rims, and warm local illumination. |
| **Hvile bed** | Duvet and folded cover were stacked rounded blocks. | A continuous cover with folds and a draped foot edge, a separate folded edge, and consistent linen detail on pillows and mattress. |
| **Natt bedside tables** | Simplified materials and a generic lamp. | The shared walnut and bronze finishes, with the redesigned stoneware lamp where fitted. The small pedestal silhouettes are retained. |
| **Bedroom bench** | Flat leather shading and sharp wood edges. | The shared leather grain and cushion treatment, subtle edge piping and softened walnut edges. |
| **Stair treads** | Stretched, repetitive wood texture and inconsistent grain. | Scanned walnut with varied offsets and the original rounded tread edges. |
| **Wood flooring** | Strong stretched streaks and excessive reflection drew attention away from the furniture. | Scanned plank texture at a physical scale, a darker warm finish, subdued normal relief and reduced floor reflection. |
| **Plants, pots, art, walls and glazing** | The plants still reveal their lightweight leaf-card construction close up; the room shell is deliberately stylized. | Retained as scene context and checked under the revised lighting. A future botanical pass should refine branch silhouettes and leaf distribution before increasing leaf texture resolution. |

## Lighting and clarity

The hemisphere light existed in the source but its `scene.add(...)` call was inside a comment. It is now active at a restrained intensity. This provides soft fill while preserving the north-window light and the transition to warm lamps.

The pass also adjusts contact shading, shadow-map resolution, floor reflection, film grain, sharpening and vignette. The aim is to keep forms readable and materials distinct without making the whole room uniformly bright.

The postprocessing target now uses the viewport size consistently with the renderer's pixel ratio. The adaptive reduction path also updates the postprocessing pixel ratio, so reducing rendering resolution actually reduces that work.

## What “4K” means here

The material library includes 4096-pixel-wide color, OpenGL normal and roughness maps for linen, leather, walnut and flooring, plus smaller delivery versions. The linen scan is slightly rectangular, so its height differs slightly from 4096.

- **Small screens:** 1K material variants.
- **Normal desktop:** 2K color and normal maps, with 1K roughness maps.
- **Large displays / 4K detail view:** 4K color and normal maps for the prominent linen and leather surfaces. Wood and floor maps remain at 2K during live rendering, and roughness at 1K, to control memory use. Their 4K source variants remain available in the asset library.
- **Dedicated 4K view:** `?quality=4k` enables a rendering budget up to 3840 × 2160 pixels and bypasses the automatic resolution reduction. A smaller browser window is not automatically a 4K screenshot.

This is a material and modeling refinement for real-time use. Rendering speed depends on the device and window size. No fixed frame-rate or percentage speed improvement is claimed.

## Material provenance

The photographed surface maps come from Poly Haven: [Rough Linen](https://polyhaven.com/a/rough_linen), [Brown Leather](https://polyhaven.com/a/brown_leather), [Natural Walnut Veneer](https://polyhaven.com/a/natural_walnut_veneer), and [Plank Flooring 03](https://polyhaven.com/a/plank_flooring_03). Poly Haven distributes these assets under [CC0](https://polyhaven.com/license). The delivery files are encoded as WebP, with source URLs, original checksums and variant dimensions recorded in `assets/materials/manifest.json`.

Material color maps use sRGB; normal and roughness maps are treated as data. The linen and leather shaders separate the scanned surface variation from its source dye, so the collection can keep its intended palette. See the [Three.js material documentation](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) for the roles of roughness, normal maps and textile sheen.
