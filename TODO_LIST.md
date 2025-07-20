### Todo list:

-   [x] 1. ~~Process and save building data when placed down (position, layer)~~
-   [x] 2. ~~Check for collision detection logic of new building when being placed (position, layer, type)~~
-   [x] 3. ~~Calculate the sprite display of logic wire, power wire, pipes~~
-   [ ] 4. Calculate the position, scale, offset (in a grid) of logic wires, power wires, pipes
-   [ ] 5. Check for collision of logic port, power port, conduit (gas input/output, liquid input/output) of the building
-   [ ] 6. Add overlay functionality to display buildings in each overlay
-   [ ] 7. Update the "Tools" card for different config: Pan speed, check valid foundation, show water/gas flow, power consumption, ...

### Check for collision rules:

-   Collision with other building in `object_layer`
-   Collision with other building that has the same `category`

### Known problems

-   Power-related bridge data (like "Conductive Wire Bridge" or "Heavi-Watt Joint Plate") has `power_port: null`

### Low priority

-   [ ] Check [Typegoose](https://github.com/typegoose/typegoose) to avoid the **Prisma needs to perform transactions** error when run seed
