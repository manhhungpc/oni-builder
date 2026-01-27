const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { processBuildingData } = require('./helpers/buildingProcess');
const { processElementData } = require('./helpers/elementProcess');
const dataReader = require('./helpers/dataReader');

const prisma = new PrismaClient();

async function main() {
    try {
        // Initialize data reader once
        dataReader.loadData();

        const args = process.argv.slice(2);
        const fileArgIndex = args.findIndex((arg) => arg === '--file');
        const folderArgIndex = args.findIndex((arg) => arg === '--folder');
        const shouldBlank = args.includes('--blank');

        // Clear existing data if --blank flag is present
        if (shouldBlank) {
            await prisma.building.deleteMany();
            await prisma.element.deleteMany();
        }

        // Get the project root (parent of server directory)
        const projectRoot = path.join(__dirname, '../../..');
        let targetPath = path.join(projectRoot, 'data/database_base/building_2025.json');

        if (folderArgIndex !== -1 && args[folderArgIndex + 1]) {
            targetPath = path.join(projectRoot, args[folderArgIndex + 1]);
        }
        if (fileArgIndex !== -1 && args[fileArgIndex + 1]) {
            targetPath = path.join(projectRoot, args[fileArgIndex + 1]);
        }

        if (!fs.existsSync(targetPath)) {
            console.error(`Error: File not found at ${targetPath}`);
        }

        // Determine if it's a file or directory
        const stats = fs.lstatSync(targetPath);

        if (stats.isDirectory()) {
            await seedFromDirectory(targetPath);
        } else if (stats.isFile() && targetPath.endsWith('.json')) {
            await seedFromFile(targetPath);
        } else {
            console.error('Error: Target must be a JSON file or directory containing JSON files');
            process.exit(1);
        }

        // Seed elements (mandatory)
        await seedElements();

        console.log('Seed completed!');
    } catch (error) {
        console.error('Seed failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function seedFromFile(jsonFilePath) {
    try {
        console.log(`Reading data from ${jsonFilePath}...`);
        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

        let buildingsToInsert = [];

        for (const buildingData of jsonData.buildingDefs) {
            if (buildingData.Deprecated) continue;
            console.log(`[Seed] Processing: ${buildingData.PrefabID}`);
            const processedData = await processBuildingData(
                buildingData,
                jsonData.buildingAndSubcategoryDataPairs
            );
            buildingsToInsert.push(processedData);
        }

        for (const building of buildingsToInsert) {
            try {
                const existingBuilding = await prisma.building.findUnique({
                    where: { name: building.name },
                });

                if (existingBuilding) {
                    await prisma.building.update({
                        where: { name: building.name },
                        data: building,
                    });
                    console.log(`Updated building: ${building.display_name}`);
                } else {
                    await prisma.building.create({
                        data: building,
                    });
                    console.log(`Created building: ${building.display_name}`);
                }
            } catch (error) {
                console.error(
                    `Failed to process building: ${building.display_name}`,
                    error.message
                );
                // throw new Error(error);
            }
        }

        return buildingsToInsert.length;
    } catch (error) {
        console.error(`Failed to process file ${jsonFilePath}:`, error);
        throw error;
    }
}

async function seedFromDirectory(directoryPath) {
    try {
        const files = fs.readdirSync(directoryPath).filter((file) => file.endsWith('.json'));
        let totalBuildings = 0;

        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            const count = await seedFromFile(filePath);
            totalBuildings += count;
        }

        console.log(`\nTotal buildings inserted: ${totalBuildings} from ${files.length} files`);
        return totalBuildings;
    } catch (error) {
        console.error('Seed from directory failed:', error);
        throw error;
    }
}

async function seedElements() {
    const projectRoot = path.join(__dirname, '../../..');
    const elementsPath = path.join(projectRoot, 'data/database_base/elements_minimal.json');

    if (!fs.existsSync(elementsPath)) {
        console.error(`Error: Elements file not found at ${elementsPath}`);
        process.exit(1);
    }

    const elements = JSON.parse(fs.readFileSync(elementsPath, 'utf8'));
    console.log(`\nSeeding ${elements.length} elements...`);

    let created = 0;
    let updated = 0;

    for (const elementData of elements) {
        const processed = processElementData(elementData);

        if (!processed) {
            console.warn(`Skipping element with missing data`);
            continue;
        }

        try {
            const existing = await prisma.element.findUnique({
                where: { name: processed.name },
            });

            if (existing) {
                await prisma.element.update({
                    where: { name: processed.name },
                    data: processed,
                });
                updated++;
            } else {
                await prisma.element.create({
                    data: processed,
                });
                created++;
            }
        } catch (error) {
            console.error(`Failed to process element: ${processed.name}`, error.message);
        }
    }

    console.log(`Elements seeded: ${created} created, ${updated} updated`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
