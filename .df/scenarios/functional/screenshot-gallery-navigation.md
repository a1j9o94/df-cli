---
name: screenshot-gallery-navigation
type: functional
spec_id: run_01KJSYMVTRZA22SC742GEMEWDJ
created_by: agt_01KJSYMVTT7H090YHJERTJN6FG
---

## Screenshot Gallery Navigation

### Preconditions
- A completed visual run with 5+ screenshots in manifest.json
- Screenshots include both build-phase and eval-phase images
- All referenced PNG files exist on disk

### Test Steps
1. Start the dashboard server
2. Navigate to the visual run detail view
3. Click the Output tab
4. Verify gallery shows thumbnail grid with 5+ thumbnails
5. Click on the 3rd thumbnail image
6. Verify expanded/lightbox view opens showing full-width image
7. Verify the caption is displayed in the expanded view
8. Click next navigation arrow
9. Verify the 4th image is now displayed in expanded view
10. Click prev navigation arrow
11. Verify the 3rd image is shown again
12. Close the lightbox (click outside or press Escape)
13. Verify the lightbox closes and gallery grid is visible again

### Pass Criteria
- All 5+ thumbnails are visible in the grid
- Lightbox opens on click with correct image
- Next/prev buttons navigate correctly
- Lightbox can be dismissed
- No images fail to load (all src attributes resolve via API)