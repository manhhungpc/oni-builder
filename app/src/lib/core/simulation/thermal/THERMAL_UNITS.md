# Thermal Units & Formulas

## Terms

| Term     | Description                                                  |
| -------- | ------------------------------------------------------------ |
| Cell     | A single tile occupied by an element (solid, liquid, or gas) |
| Entity   | A debris item lying on a floor tile                          |
| Building | A placed structure (e.g. Generator, Pump, Tile)              |
| Tick     | 1 tick = 0.2 seconds                                         |

## Units

| Symbol | Name                   | Unit                               |
| ------ | ---------------------- | ---------------------------------- |
| q      | Heat transfer          | DTU                                |
| ΔT     | Temperature difference | °C                                 |
| Δt     | Tick interval          | 0.2 s                              |
| k      | Thermal conductivity   | DTU/(m·s·°C)                       |
| c      | Specific heat capacity | DTU/(g·°C)                         |
| m      | Mass                   | g                                  |
| THC    | Total heat capacity    | DTU/°C                             |
| s      | Building mass scale    | (0.2 for buildings, 1.0 for tiles) |
| A      | Building area          | tiles                              |

## Transfer Limits

No transfer if:

- |ΔT| < 1 °C
- |q| < 0.1 DTU
- either mass < 1 g

Overshoot cap:

- q cannot cause temperature change > ΔT/4 in either object per tick
- q_max per object = ΔT / (4 × m × c)

Building-cell cap:

```
T_eq = (T_building × THC_building + T_cell × THC_cell × A) / (THC_building + THC_cell × A)
q_max = THC_building × (T_building − T_eq) / A
```

## Test

File **thermal-test.ts**:

1. `startTemp` in °C
2. `mass` in kg (converted to g internally: × 1000)
3. Currently only support calculate heat transfer between elements, not between elements and buildings

Run the test:

```bash
npx tsx src/lib/core/thermal/thermal-test.ts
```
