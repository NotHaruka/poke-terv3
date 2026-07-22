/** Registry of all interior map definitions in the game */

import { InteriorDefinition } from './InteriorDefinition.js';

export class InteriorRegistry {
  private static interiors = new Map<string, InteriorDefinition>();

  static init(): void {
    if (this.interiors.size > 0) return;

    // 1. Pokémon Center Interior (Healing Center)
    this.register({
      interiorId: 'pokecenter_interior',
      name: 'Pokémon Center Interior',
      widthTiles: 13,
      heightTiles: 10,
      music: '/morning_in_the_village.mp3',
      lighting: { ambientColor: '#fff9e6', brightness: 0.95, warmGlow: true },
      entranceSpawn: { tileX: 6, tileY: 8, direction: 'up' },
      exitTile: { tileX: 6, tileY: 9 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,5,5,5,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,2,2,2,2,2,2,2,1,1,0],
        [0,1,1,2,2,2,2,2,2,2,1,1,0],
        [0,1,1,2,2,2,2,2,2,2,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,4,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'nurse_counter', name: 'Nurse Reception Counter', type: 'counter', tileX: 4, tileY: 2, widthTiles: 5, heightTiles: 1, solid: true },
        { id: 'healing_machine', name: 'Pokémon Healing Machine', type: 'healing_machine', tileX: 6, tileY: 1, widthTiles: 1, heightTiles: 1, solid: true, interactable: true, interactionText: 'Healing Machine ready. Rest your team here!' },
        { id: 'pc_terminal', name: 'Storage PC Terminal', type: 'pc', tileX: 10, tileY: 1, widthTiles: 1, heightTiles: 1, solid: true, interactable: true, interactionText: 'Accessed Pokémon Storage System.' },
        { id: 'waiting_couch_1', name: 'Plush Lounge Sofa', type: 'chair', tileX: 2, tileY: 5, widthTiles: 1, heightTiles: 2, solid: true },
        { id: 'waiting_couch_2', name: 'Plush Lounge Sofa', type: 'chair', tileX: 10, tileY: 5, widthTiles: 1, heightTiles: 2, solid: true },
        { id: 'indoor_plant_1', name: 'House Palm', type: 'plant', tileX: 1, tileY: 1, widthTiles: 1, heightTiles: 1, solid: true },
        { id: 'indoor_plant_2', name: 'House Palm', type: 'plant', tileX: 11, tileY: 1, widthTiles: 1, heightTiles: 1, solid: true },
      ],
      npcs: [
        {
          id: 101,
          name: 'Nurse Joy',
          sprite: 'nurse',
          position: { x: 6 * 16, y: 1.25 * 16 },
          direction: 'down',
          dialogues: [[
            { speaker: 'Nurse Joy', text: 'Welcome to the Pokémon Center!' },
            { speaker: 'Nurse Joy', text: 'We restore your tired monsters to full health.' },
            { speaker: 'Nurse Joy', text: 'Your party has been fully healed and rested!' }
          ]]
        },
        {
          id: 102,
          name: 'Trainer Sam',
          sprite: 'trainer_m',
          position: { x: 2 * 16, y: 4 * 16 },
          direction: 'right',
          dialogues: [[
            { speaker: 'Trainer Sam', text: 'The Healing Machine uses pure energy to restore HP in seconds!' }
          ]]
        }
      ]
    });

    // 2. Pokémon Mart Interior (Shop)
    this.register({
      interiorId: 'pokemart_interior',
      name: 'Pokémon Mart Interior',
      widthTiles: 11,
      heightTiles: 9,
      music: '/lanterns_at_home.mp3',
      lighting: { ambientColor: '#ffffff', brightness: 0.95, warmGlow: false },
      entranceSpawn: { tileX: 5, tileY: 7, direction: 'up' },
      exitTile: { tileX: 5, tileY: 8 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,5,0],
        [0,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,4,3,3,3,3,0],
        [0,0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'clerk_counter', name: 'Mart Cashier Counter', type: 'counter', tileX: 2, tileY: 3, widthTiles: 3, heightTiles: 1, solid: true },
        { id: 'shop_shelf_1', name: 'Pokéball & Medicine Display', type: 'shop_shelf', tileX: 6, tileY: 2, widthTiles: 3, heightTiles: 1, solid: true, interactable: true, interactionText: 'Shelves stacked with Poké Balls, Potions, and Antidotes!' },
        { id: 'shop_shelf_2', name: 'Berry & Travel Supply Display', type: 'shop_shelf', tileX: 6, tileY: 4, widthTiles: 3, heightTiles: 1, solid: true, interactable: true, interactionText: 'Row of fresh Oran Berries and Escape Ropes.' },
        { id: 'plant_corner', name: 'Store Decor Plant', type: 'plant', tileX: 9, tileY: 1, widthTiles: 1, heightTiles: 1, solid: true },
      ],
      npcs: [
        {
          id: 103,
          name: 'Mart Clerk',
          sprite: 'clerk',
          position: { x: 3 * 16, y: 2.25 * 16 },
          direction: 'down',
          dialogues: [[
            { speaker: 'Mart Clerk', text: 'Welcome to the Pokémon Mart!' },
            { speaker: 'Mart Clerk', text: 'We stock Poké Balls, Potions, and essential journey supplies.' }
          ]]
        },
        {
          id: 104,
          name: 'Shopper Lisa',
          sprite: 'trainer_f',
          position: { x: 7 * 16, y: 3 * 16 },
          direction: 'up',
          dialogues: [[
            { speaker: 'Shopper Lisa', text: 'Always stock up on extra Poké Balls before entering tall grass!' }
          ]]
        }
      ]
    });

    // 3. Research Lab Interior
    this.register({
      interiorId: 'lab_interior',
      name: 'Professor\'s Research Lab',
      widthTiles: 13,
      heightTiles: 11,
      music: '/morning_in_the_village.mp3',
      lighting: { ambientColor: '#f0f8ff', brightness: 0.95, warmGlow: false },
      entranceSpawn: { tileX: 6, tileY: 9, direction: 'up' },
      exitTile: { tileX: 6, tileY: 10 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,5,5,5,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,2,2,2,2,2,2,2,1,1,0],
        [0,1,1,2,2,2,2,2,2,2,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,4,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'prof_desk', name: 'Professor\'s Main Desk', type: 'table', tileX: 5, tileY: 2, widthTiles: 3, heightTiles: 1, solid: true },
        { id: 'starter_display', name: 'Starter Poké Ball Machine', type: 'decor', tileX: 6, tileY: 1, widthTiles: 1, heightTiles: 1, solid: true, interactable: true, interactionText: 'Three mysterious Poké Balls rest in glass capsules!' },
        { id: 'bookshelf_left', name: 'Research Bookshelf', type: 'bookshelf', tileX: 1, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true, interactable: true, interactionText: 'Tomes on monster genetics, biomes, and evolution.' },
        { id: 'bookshelf_right', name: 'Research Bookshelf', type: 'bookshelf', tileX: 10, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true, interactable: true, interactionText: 'Encyclopedias detailing regional Pokémon habitats.' },
        { id: 'lab_pc_1', name: 'Supercomputer Array', type: 'pc', tileX: 1, tileY: 4, widthTiles: 1, heightTiles: 2, solid: true, interactable: true, interactionText: 'Analyzing wild encounter frequencies across biomes.' },
        { id: 'lab_pc_2', name: 'Server Rack', type: 'pc', tileX: 11, tileY: 4, widthTiles: 1, heightTiles: 2, solid: true, interactable: true, interactionText: 'Synchronizing regional Pokédex data logs.' },
      ],
      npcs: [
        {
          id: 105,
          name: 'Professor Elm',
          sprite: 'professor',
          position: { x: 6 * 16, y: 3 * 16 },
          direction: 'down',
          dialogues: [[
            { speaker: 'Professor Elm', text: 'Ah, young Trainer! Welcome to my Laboratory.' },
            { speaker: 'Professor Elm', text: 'Our world is filled with remarkable creatures called Pokémon.' },
            { speaker: 'Professor Elm', text: 'Explore the infinite biomes and log your discoveries in the Pokédex!' }
          ]]
        },
        {
          id: 106,
          name: 'Lab Assistant Mark',
          sprite: 'scientist',
          position: { x: 3 * 16, y: 5 * 16 },
          direction: 'right',
          dialogues: [[
            { speaker: 'Assistant Mark', text: 'The Professor has dedicated his life to researching wild monster ecology!' }
          ]]
        }
      ]
    });

    // 4. House Interior (Cozy Residence)
    this.register({
      interiorId: 'house_001_interior',
      name: 'Cozy Residence Interior',
      widthTiles: 10,
      heightTiles: 8,
      music: '/lanterns_at_home.mp3',
      lighting: { ambientColor: '#fff5e6', brightness: 0.9, warmGlow: true },
      entranceSpawn: { tileX: 4, tileY: 6, direction: 'up' },
      exitTile: { tileX: 4, tileY: 7 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,2,2,2,2,2,2,1,0],
        [0,1,2,2,2,2,2,2,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,4,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'bed', name: 'Cozy Quilted Bed', type: 'bed', tileX: 1, tileY: 1, widthTiles: 1, heightTiles: 2, solid: true, interactable: true, interactionText: 'A soft, comfortable bed. Taking a quick nap restores your energy!' },
        { id: 'tv_set', name: 'Wide Screen TV', type: 'tv', tileX: 4, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true, interactable: true, interactionText: 'A program is broadcast: "Top Trainers conquer the Frostbound Tundra!"' },
        { id: 'table', name: 'Wooden Dining Table', type: 'table', tileX: 6, tileY: 3, widthTiles: 2, heightTiles: 1, solid: true },
        { id: 'house_plant', name: 'Potted Fern', type: 'plant', tileX: 8, tileY: 1, widthTiles: 1, heightTiles: 1, solid: true },
      ],
      npcs: [
        {
          id: 107,
          name: 'Grandma Clara',
          sprite: 'old_woman',
          position: { x: 7 * 16, y: 4 * 16 },
          direction: 'left',
          dialogues: [[
            { speaker: 'Grandma Clara', text: 'Hello dearie! Always make sure to visit home after long journeys.' }
          ]]
        }
      ]
    });

    // 5. Mayor's Grand Manor Interior
    this.register({
      interiorId: 'manor_interior',
      name: 'Mayor\'s Grand Manor Interior',
      widthTiles: 13,
      heightTiles: 10,
      music: '/morning_in_the_village.mp3',
      lighting: { ambientColor: '#fdfefe', brightness: 0.95, warmGlow: true },
      entranceSpawn: { tileX: 6, tileY: 8, direction: 'up' },
      exitTile: { tileX: 6, tileY: 9 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,5,5,5,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,2,2,2,2,2,2,2,2,2,1,0],
        [0,1,2,2,2,2,2,2,2,2,2,1,0],
        [0,1,2,2,2,2,2,2,2,2,2,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,4,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'mayor_desk', name: 'Mahogany Executive Desk', type: 'table', tileX: 5, tileY: 2, widthTiles: 3, heightTiles: 1, solid: true },
        { id: 'fireplace', name: 'Stone Fireplace', type: 'fireplace', tileX: 1, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true, interactable: true, interactionText: 'Warm flames crackle inside the hearth.' },
        { id: 'bookshelf_left', name: 'City Archives', type: 'bookshelf', tileX: 10, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true },
        { id: 'sofa_set', name: 'Velvet Sofa', type: 'chair', tileX: 2, tileY: 4, widthTiles: 1, heightTiles: 2, solid: true },
      ],
      npcs: [
        {
          id: 108,
          name: 'Mayor Reginald',
          sprite: 'mayor',
          position: { x: 6 * 16, y: 3 * 16 },
          direction: 'down',
          dialogues: [[
            { speaker: 'Mayor Reginald', text: 'Greetings, Trainer! Welcome to Permanent City.' },
            { speaker: 'Mayor Reginald', text: 'Our town is surrounded by wild routes rich in diverse Pokémon species!' }
          ]]
        }
      ]
    });

    // 6. Inn & Lodge Interior
    this.register({
      interiorId: 'inn_interior',
      name: 'Traveler\'s Inn Interior',
      widthTiles: 12,
      heightTiles: 9,
      music: '/lanterns_at_home.mp3',
      lighting: { ambientColor: '#fff2e6', brightness: 0.9, warmGlow: true },
      entranceSpawn: { tileX: 5, tileY: 7, direction: 'up' },
      exitTile: { tileX: 5, tileY: 8 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,5,5,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,2,2,2,2,2,2,2,2,1,0],
        [0,1,2,2,2,2,2,2,2,2,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,4,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'inn_counter', name: 'Inn Reception Counter', type: 'counter', tileX: 2, tileY: 2, widthTiles: 3, heightTiles: 1, solid: true },
        { id: 'guest_bed_1', name: 'Traveler Bed', type: 'bed', tileX: 7, tileY: 1, widthTiles: 1, heightTiles: 2, solid: true },
        { id: 'guest_bed_2', name: 'Traveler Bed', type: 'bed', tileX: 9, tileY: 1, widthTiles: 1, heightTiles: 2, solid: true },
        { id: 'inn_table', name: 'Dining Table', type: 'table', tileX: 2, tileY: 4, widthTiles: 2, heightTiles: 1, solid: true },
      ],
      npcs: [
        {
          id: 109,
          name: 'Innkeeper Martha',
          sprite: 'innkeeper',
          position: { x: 3 * 16, y: 1.25 * 16 },
          direction: 'down',
          dialogues: [[
            { speaker: 'Innkeeper Martha', text: 'Welcome weary traveler! Rest your feet and grab a warm meal.' }
          ]]
        }
      ]
    });

    // 7. Warehouse Interior
    this.register({
      interiorId: 'warehouse_interior',
      name: 'Cargo Warehouse Interior',
      widthTiles: 12,
      heightTiles: 9,
      music: '/morning_in_the_village.mp3',
      lighting: { ambientColor: '#e0e4e8', brightness: 0.85, warmGlow: false },
      entranceSpawn: { tileX: 5, tileY: 7, direction: 'up' },
      exitTile: { tileX: 5, tileY: 8 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,5,5,0],
        [0,3,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,4,3,3,3,3,3,0],
        [0,0,0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'crates_1', name: 'Cargo Wooden Crates', type: 'crate', tileX: 1, tileY: 1, widthTiles: 2, heightTiles: 2, solid: true, interactable: true, interactionText: 'Boxes filled with Poké Ball parts and construction supplies.' },
        { id: 'crates_2', name: 'Metal Drums', type: 'barrel', tileX: 8, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true },
        { id: 'storage_rack', name: 'High Storage Racks', type: 'shop_shelf', tileX: 8, tileY: 3, widthTiles: 3, heightTiles: 2, solid: true },
      ],
      npcs: [
        {
          id: 110,
          name: 'Cargo Foreman Bob',
          sprite: 'worker',
          position: { x: 4 * 16, y: 3 * 16 },
          direction: 'down',
          dialogues: [[
            { speaker: 'Foreman Bob', text: 'Heavy cargo shipment coming in from Route 2!' }
          ]]
        }
      ]
    });

    // 8. Ranger Station Interior
    this.register({
      interiorId: 'ranger_interior',
      name: 'Ranger Station Interior',
      widthTiles: 11,
      heightTiles: 9,
      music: '/morning_in_the_village.mp3',
      lighting: { ambientColor: '#e8f8f5', brightness: 0.9, warmGlow: true },
      entranceSpawn: { tileX: 5, tileY: 7, direction: 'up' },
      exitTile: { tileX: 5, tileY: 8 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,5,0],
        [0,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,0],
        [0,1,2,2,2,2,2,2,2,1,0],
        [0,1,2,2,2,2,2,2,2,1,0],
        [0,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,4,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'tactical_map', name: 'Biome Wilderness Map Table', type: 'tactical_map', tileX: 4, tileY: 3, widthTiles: 3, heightTiles: 2, solid: true, interactable: true, interactionText: 'Detailed topographic survey map tracking wild monster migrations.' },
        { id: 'gear_rack', name: 'Ranger Equipment Rack', type: 'shop_shelf', tileX: 1, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true },
      ],
      npcs: [
        {
          id: 111,
          name: 'Ranger Captain Dan',
          sprite: 'ranger',
          position: { x: 5 * 16, y: 2.25 * 16 },
          direction: 'down',
          dialogues: [[
            { speaker: 'Ranger Captain Dan', text: 'Maintain ecological harmony! Always treat wild Pokémon with respect.' }
          ]]
        }
      ]
    });

    // 9. Windmill Cottage Interior
    this.register({
      interiorId: 'windmill_interior',
      name: 'Windmill Cottage Interior',
      widthTiles: 10,
      heightTiles: 8,
      music: '/lanterns_at_home.mp3',
      lighting: { ambientColor: '#fff5e6', brightness: 0.9, warmGlow: true },
      entranceSpawn: { tileX: 4, tileY: 6, direction: 'up' },
      exitTile: { tileX: 4, tileY: 7 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,4,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'mill_mechanism', name: 'Wooden Gear Shaft', type: 'decor', tileX: 4, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true, interactable: true, interactionText: 'Heavy wooden gears turn smoothly driven by the mountain breeze.' },
        { id: 'flour_sacks', name: 'Grain Sacks', type: 'crate', tileX: 1, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true },
      ],
      npcs: [
        {
          id: 112,
          name: 'Old Miller Hans',
          sprite: 'old_man',
          position: { x: 2 * 16, y: 3 * 16 },
          direction: 'right',
          dialogues: [[
            { speaker: 'Miller Hans', text: 'The winds from Route 1 turn our mill day and night!' }
          ]]
        }
      ]
    });

    // 10. Fashion Stylist Boutique Interior
    this.register({
      interiorId: 'boutique_interior',
      name: 'Fashion Stylist Boutique Interior',
      widthTiles: 11,
      heightTiles: 9,
      music: '/morning_in_the_village.mp3',
      lighting: { ambientColor: '#fce4ec', brightness: 0.95, warmGlow: true },
      entranceSpawn: { tileX: 5, tileY: 7, direction: 'up' },
      exitTile: { tileX: 5, tileY: 8 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,5,0],
        [0,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,2,2,2,2,2,3,3,0],
        [0,3,3,2,2,2,2,2,3,3,0],
        [0,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,3,3,3,3,3,0],
        [0,3,3,3,3,4,3,3,3,3,0],
        [0,0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'stylist_counter', name: 'Stylist Fitting Table', type: 'counter', tileX: 4, tileY: 2, widthTiles: 3, heightTiles: 1, solid: true },
        { id: 'clothing_rack_1', name: 'Designer Apparel Rack', type: 'shop_shelf', tileX: 1, tileY: 2, widthTiles: 2, heightTiles: 1, solid: true },
        { id: 'clothing_rack_2', name: 'Designer Apparel Rack', type: 'shop_shelf', tileX: 8, tileY: 2, widthTiles: 2, heightTiles: 1, solid: true },
        { id: 'mirror', name: 'Full Length Mirror', type: 'mirror', tileX: 9, tileY: 1, widthTiles: 1, heightTiles: 1, solid: true, interactable: true, interactionText: 'Looking stylish! Talk to the Stylist to customize outfit colors and hair.' },
      ],
      npcs: [
        {
          id: 113,
          name: 'Stylist Jean',
          sprite: 'stylist',
          position: { x: 5 * 16, y: 1.25 * 16 },
          direction: 'down',
          dialogues: [[
            { speaker: 'Stylist Jean', text: 'Bonjour! Ready for a fashion makeover?' },
            { speaker: 'Stylist Jean', text: 'Opening outfit customization menu now!' }
          ]]
        }
      ]
    });

    // 11. City Grand Library Interior
    this.register({
      interiorId: 'library_interior',
      name: 'City Grand Library Interior',
      widthTiles: 12,
      heightTiles: 9,
      music: '/lanterns_at_home.mp3',
      lighting: { ambientColor: '#fef5e7', brightness: 0.9, warmGlow: true },
      entranceSpawn: { tileX: 5, tileY: 7, direction: 'up' },
      exitTile: { tileX: 5, tileY: 8 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,5,5,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,2,2,2,2,2,2,2,2,1,0],
        [0,1,2,2,2,2,2,2,2,2,1,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,4,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'lib_bookshelf_1', name: 'Ancient History Shelf', type: 'bookshelf', tileX: 1, tileY: 1, widthTiles: 3, heightTiles: 1, solid: true },
        { id: 'lib_bookshelf_2', name: 'Biomes & Habitats Shelf', type: 'bookshelf', tileX: 5, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true },
        { id: 'lib_bookshelf_3', name: 'Monster Evolution Shelf', type: 'bookshelf', tileX: 8, tileY: 1, widthTiles: 3, heightTiles: 1, solid: true },
        { id: 'reading_desk', name: 'Study Desk', type: 'table', tileX: 4, tileY: 4, widthTiles: 4, heightTiles: 1, solid: true },
      ],
      npcs: [
        {
          id: 114,
          name: 'Librarian Sophia',
          sprite: 'teacher',
          position: { x: 5 * 16, y: 3.25 * 16 },
          direction: 'down',
          dialogues: [[
            { speaker: 'Librarian Sophia', text: 'Shh! Knowledge is the greatest asset of any Pokémon Trainer.' }
          ]]
        }
      ]
    });

    // 12. Collector's Haven Interior
    this.register({
      interiorId: 'collector_interior',
      name: 'Collector\'s Haven Interior',
      widthTiles: 10,
      heightTiles: 8,
      music: '/morning_in_the_village.mp3',
      lighting: { ambientColor: '#f4f6f7', brightness: 0.9, warmGlow: true },
      entranceSpawn: { tileX: 4, tileY: 6, direction: 'up' },
      exitTile: { tileX: 4, tileY: 7 },
      tilemap: [
        [0,0,0,0,0,0,0,0,0,0],
        [0,5,5,5,5,5,5,5,5,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,2,2,2,2,2,2,1,0],
        [0,1,2,2,2,2,2,2,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,4,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0],
      ],
      furniture: [
        { id: 'trophy_case', name: 'Shiny Trophy Case', type: 'shop_shelf', tileX: 1, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true },
        { id: 'rare_display', name: 'Rare Fossil Case', type: 'decor', tileX: 7, tileY: 1, widthTiles: 2, heightTiles: 1, solid: true, interactable: true, interactionText: 'Ancient Helix and Dome fossils displayed in pristine glass!' },
      ],
      npcs: [
        {
          id: 115,
          name: 'Collector Arthur',
          sprite: 'gentleman',
          position: { x: 4 * 16, y: 2 * 16 },
          direction: 'down',
          dialogues: [[
            { speaker: 'Collector Arthur', text: 'I collect rare artifacts and shiney evolutionary stones from across the land!' }
          ]]
        }
      ]
    });
  }

  public static get(interiorId: string): InteriorDefinition | undefined {
    this.init();
    return this.interiors.get(interiorId);
  }

  public static register(def: InteriorDefinition): void {
    this.interiors.set(def.interiorId, def);
  }
}
