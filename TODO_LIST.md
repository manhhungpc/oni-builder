### Todo list:

-   [x] 1. ~~Process and save building data when placed down (position, layer)~~
-   [x] 2. ~~Check for collision detection logic of new building when being placed (position, layer, type)~~
-   [ ] 3. Calculate the position of logic port, power port, conduit
-   [ ] 4. Check for collision of logic port, power port, conduit (gas input/output, liquid input/output) of the building
-   [ ] 5. **Calculate the sprite display of logic wire, power wire, pipes**
-   [ ] 6. Add overlay functionality to display buildings in each overlay
-   [ ] 7. Update the "Tools" card for different config: Pan speed, check valid foundation, show water/gas flow, power consumption, ...

### Check for collision rules:

-   Collision with other building in `object_layer`
-   Collision with other building that has the same `category`

### Known problems

-   Power-related bridge data (like "Conductive Wire Bridge" or "Heavi-Watt Joint Plate") has `power_port: null`
